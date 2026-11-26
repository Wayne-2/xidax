import {
  handleDeleteProduct,
  handleLogin,
  handleLogout,
  handleMe,
  handleUserOrders,
  handleProducts,
  handleRegister,
  handleSettings,
  handleUpdateMe,
  json,
} from "./account";
import {
  applyWireDetails,
  confirmPaymentSent,
  createCheckout,
  expireStaleSessions,
  getSessionById,
  listActiveWallets,
  submitCardPayment,
  isCheckoutOtpVerified,
  notifyWirePending,
  sendCheckoutOtp,
  submitPaymentProof,
  updateCheckoutWallet,
  verifyCheckoutOtp,
} from "./checkout";
import {
  type CheckoutRequest,
  type Env,
  type RegisteredProductPayload,
  type WireDetails,
} from "./types";
import {
  createWallet,
  deleteWallet,
  listWallets,
  updateWallet,
} from "./admin-wallets";
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  updateBankAccount,
} from "./admin-bank-accounts";
import { corsHeaders, isOriginAllowed } from "./cors";
import { runConfigCheck } from "./config-check";
import { parseFirebaseConfig } from "./auth";
import { adminGuard } from "./admin-auth";
import { findUserByToken } from "./auth";
import { clearGiveawayPrize, getGiveawayStatus, redeemGiveaway, setGiveawayClosing, setGiveawayPrize } from "./giveaway";
import {
  answerQuestion,
  appendMessage,
  clearMessages,
  greetingMessage,
  listMessages,
} from "./chat";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "./cart";
import {
  addAdmin,
  countAdmins,
  listAdmins,
  removeAdmin,
} from "./admin-admins";
import {
  getAdminOrder,
  getAdminOrderStats,
  listAdminOrders,
  updateAdminOrderStatus,
} from "./admin-orders";
import {
  getAdminUser,
  getAdminUserStats,
  listAdminUsers,
} from "./admin-users";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listAllProducts,
  listPublishedProducts,
  setPublished,
  updateProduct,
  validateProductInput,
} from "./admin-products";
import { deleteImage, serveImage, uploadImage } from "./images";
import { lookupPromo } from "./promo";
import {
  assignUserPromo,
  deleteUserPromo,
  generateUserPromoCode,
  getUserPromo,
  setUserPromoActive,
} from "./user-promo";
import { clientIp, rateLimit } from "./rate-limit";
import {
  deleteCatalogItem,
  getCatalogItem,
  listCatalogItems,
  saveCatalogItem,
  setCatalogPublished,
  type CatalogKind,
} from "./catalog";
import { sendVerificationEmail } from "./email";
import {
  checkOTPStatus,
  ensureInitialized,
  generateSixDigitOTP,
  invalidateOTP,
  markEmailVerified,
  readToken,
  storeOTP,
  verifyOTP,
} from "./auth";

function jsonWithCors(
  payload: unknown,
  request: Request,
  env: Env,
  status = 200
) {
  const response = json(payload, status);
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function ensureUserSettings(env: Env, userId: string) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO user_settings
       (user_id, order_updates, drop_notifications, marketing_emails, language, currency)
     VALUES (?1, 1, 1, 0, 'English (Nigeria)', 'USD ($)')`
  )
    .bind(userId)
    .run();
}


async function handleRegistration(env: Env, request: Request) {
  const payload = (await request.json()) as RegisteredProductPayload;

  if (!payload?.email || !payload?.name || !payload?.orderNumber) {
    return json({ error: "Invalid registration." }, 400);
  }

  const labelNumber = `PCM-LBL-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
  const trackingNumber = `PCMT-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;

  await env.DB.prepare(
    `INSERT INTO registrations
       (id, email, kind, name, order_number, purchased_on, label_number, tracking_number, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  )
    .bind(
      crypto.randomUUID(),
      payload.email,
      payload.kind,
      payload.name,
      payload.orderNumber,
      payload.purchasedOn ?? "",
      labelNumber,
      trackingNumber,
      new Date().toISOString()
    )
    .run();

  return json({ ok: true, labelNumber, trackingNumber }, 201);
}


async function handleOrders(env: Env, url: URL) {
  const email = url.searchParams.get("email");

  if (!email) {
    return json({ error: "email is required." }, 400);
  }

  const rows = await env.DB.prepare(
    `SELECT id, reference, total, currency, method, status, created_at
       FROM orders WHERE email = ?1 ORDER BY created_at DESC LIMIT 50`
  )
    .bind(email)
    .all<{
      id: string;
      reference: string;
      total: number;
      currency: string;
      method: string;
      status: string;
      created_at: string;
    }>();

  return json({ orders: rows.results ?? [] });
}

async function handleSendOTP(request: Request, env: Env) {
  const body = await readJson(request);

  if (!body) return jsonWithCors({ error: "Invalid request." }, request, env, 400);

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return jsonWithCors({ error: "Missing Firebase ID token." }, request, env, 401);
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;

    if (!uid || !email) {
      return jsonWithCors({ error: "Invalid token." }, request, env, 401);
    }

    const userRecord = await firebaseAuth.getUser(uid);

    if (userRecord.emailVerified) {
      return jsonWithCors({ error: "This email address is already verified." }, request, env, 400);
    }

    const status = await checkOTPStatus(env, uid);

    if (status.hasPendingOTP && status.cooldownSeconds > 0) {
      return jsonWithCors({
          error: `Please wait ${status.cooldownSeconds} seconds before requesting another code.`,
          code: "cooldown",
          cooldown: true,
          retryAfter: status.cooldownSeconds,
        }, request, env, 429);
    }

    const otp = generateSixDigitOTP();
    await storeOTP(env, uid, email, otp);

    const resendApiKey = env.RESEND_API_KEY;

    if (!resendApiKey) {
      await invalidateOTP(env, uid);
      return jsonWithCors({ error: "Email service is not configured." }, request, env, 500);
    }

    const emailResponse = await sendVerificationEmail({
      apiKey: resendApiKey,
      to: email,
      otp,
    });

    if (!emailResponse.ok) {
      await invalidateOTP(env, uid);
      console.error("resend send failed:", emailResponse.status);

      return jsonWithCors({ error: "We could not send the verification email. Please try again." }, request, env, 502);
    }

    await env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id = ?1")
      .bind(uid)
      .run();

    return jsonWithCors({
      success: true,
      message: "A verification code is on its way to your inbox.",
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    }, request, env);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    console.error("send-otp error:", code);

    if (code === "auth/invalid-id-token" || code === "auth/expired-id-token") {
      return jsonWithCors({ error: "Your session has expired. Please sign in again." }, request, env, 401);
    }

    if (code === "auth/user-not-found") {
      return jsonWithCors({ error: "Account not found." }, request, env, 404);
    }

    return jsonWithCors({ error: "We could not send the code. Please try again." }, request, env, 500);
  }
}

async function handleVerifyOTP(request: Request, env: Env) {
  const body = await readJson(request);

  if (!body) return jsonWithCors({ error: "Invalid request." }, request, env, 400);

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (!idToken || !otp) {
    return jsonWithCors({ error: "Missing ID token or OTP." }, request, env, 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    return jsonWithCors({ error: "Enter the six digit code from your email." }, request, env, 400);
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    if (!uid) {
      return jsonWithCors({ error: "Invalid token." }, request, env, 401);
    }

    const result = await verifyOTP(env, uid, otp);

    if (!result.valid) {
      const reasonMap: Record<string, string> = {
        not_found: "That code is not valid. Request a new one.",
        expired: "That code has expired. Request a new one.",
        max_attempts: "Too many incorrect attempts. Request a new code.",
        invalid_otp: "That code is not correct.",
        unavailable: "Verification is unavailable right now.",
      };

      return jsonWithCors({
          error:
            reasonMap[result.reason] ?? "That code could not be verified.",
          code: result.reason,
          attemptsRemaining: result.attemptsRemaining ?? 0,
        }, request, env, 400);
    }

    // email_verified is a reserved claim, so it must be set through the
    // Admin SDK user update API rather than custom claims.
    await markEmailVerified(env, uid);

    await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?1")
      .bind(uid)
      .run();

    return jsonWithCors({ success: true, verified: true }, request, env);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    console.error("verify-otp error:", code);

    if (code === "auth/invalid-id-token" || code === "auth/expired-id-token") {
      return jsonWithCors({ error: "Your session has expired. Please sign in again." }, request, env, 401);
    }

    return jsonWithCors({ error: "We could not verify that code. Please try again." }, request, env, 500);
  }
}

async function handleResendOTP(request: Request, env: Env) {
  const body = await readJson(request);

  if (!body) return jsonWithCors({ error: "Invalid request." }, request, env, 400);

  const idToken = typeof body.idToken === "string" ? body.idToken : "";

  if (!idToken) {
    return jsonWithCors({ error: "Missing Firebase ID token." }, request, env, 401);
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    if (!uid) {
      return jsonWithCors({ error: "Invalid token." }, request, env, 401);
    }

    const userRecord = await firebaseAuth.getUser(uid);
    const email = userRecord.email ?? decoded.email;

    if (!email) {
      return jsonWithCors({ error: "This account has no email address." }, request, env, 400);
    }

    if (userRecord.emailVerified) {
      return jsonWithCors({ error: "This email address is already verified." }, request, env, 400);
    }

    const status = await checkOTPStatus(env, uid);

    if (status.hasPendingOTP && status.cooldownSeconds > 0) {
      return jsonWithCors({
          error: `Please wait ${status.cooldownSeconds} seconds before requesting another code.`,
          code: "cooldown",
          cooldown: true,
          retryAfter: status.cooldownSeconds,
        }, request, env, 429);
    }

    // Replace any previous code.
    await invalidateOTP(env, uid);

    const otp = generateSixDigitOTP();
    await storeOTP(env, uid, email, otp);

    const resendApiKey = env.RESEND_API_KEY;

    if (!resendApiKey) {
      await invalidateOTP(env, uid);
      return jsonWithCors({ error: "Email service is not configured." }, request, env, 500);
    }

    const emailResponse = await sendVerificationEmail({
      apiKey: resendApiKey,
      to: email,
      otp,
    });

    if (!emailResponse.ok) {
      await invalidateOTP(env, uid);
      console.error("resend send failed:", emailResponse.status);

      return jsonWithCors({ error: "We could not send the verification email. Please try again." }, request, env, 502);
    }

    return jsonWithCors({
      success: true,
      message: "A new verification code is on its way to your inbox.",
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    }, request, env);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    console.error("resend-otp error:", code);

    if (code === "auth/invalid-id-token" || code === "auth/expired-id-token") {
      return jsonWithCors({ error: "Your session has expired. Please sign in again." }, request, env, 401);
    }

    return jsonWithCors({ error: "We could not send the code. Please try again." }, request, env, 500);
  }
}

async function handleOTPStatus(request: Request, env: Env) {
  const token = readToken(request);

  if (!token) {
    return jsonWithCors({ error: "Missing authorization header." }, request, env, 401);
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);

    const decoded = await firebaseAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const status = await checkOTPStatus(env, uid);
    const userRecord = await firebaseAuth.getUser(uid);

    return jsonWithCors({
      emailVerified: userRecord.emailVerified,
      hasPendingOTP: status.hasPendingOTP,
      expiresIn: status.expiresIn,
      attempts: status.attempts,
      lastSentAt: status.lastSentAt,
      cooldownSeconds: status.cooldownSeconds,
    }, request, env);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";

    if (code === "auth/invalid-id-token" || code === "auth/expired-id-token") {
      return jsonWithCors({ error: "Invalid or expired ID token." }, request, env, 401);
    }

    return jsonWithCors({ error: "Could not read verification status." }, request, env, 500);
  }
}

async function handleDeleteAccount(request: Request, env: Env) {
  const { auth: firebaseAuth } = await ensureInitialized(env);

  // The uid always comes from the verified token, never from the body.
  const token = readToken(request);

  if (!token) {
    return jsonWithCors({ error: "Not signed in." }, request, env, 401);
  }

  let uid: string;

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return jsonWithCors({ error: "Invalid or expired session." }, request, env, 401);
  }

  await firebaseAuth.deleteUser(uid).catch((error: unknown) => {
    console.error("deleteUser failed:", (error as { code?: string }).code ?? "");
  });

  const deleteStatements = [
    env.DB.prepare("DELETE FROM email_otps WHERE uid = ?1").bind(uid),
    env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?1").bind(uid),
    env.DB.prepare("DELETE FROM user_orders WHERE user_id = ?1").bind(uid),
    env.DB.prepare("DELETE FROM user_products WHERE user_id = ?1").bind(uid),
    env.DB.prepare("DELETE FROM user_settings WHERE user_id = ?1").bind(uid),
    env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(uid),
  ];

  await env.DB.batch(deleteStatements);

  return jsonWithCors({ deleted: true }, request, env);
}

const worker = {
  async handleFetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "OPTIONS") {
      return jsonWithCors({}, request, env);
    }

    // Reject cross origin calls from sites we do not control.
    const origin = request.headers.get("origin");

    if (origin && !isOriginAllowed(origin, env)) {
      return jsonWithCors({ error: "Origin not allowed." }, request, env, 403);
    }

    try {
      if (path.startsWith("/api/")) {
        await ensureUserSettings(env, "temp");
      }

      if (request.method === "GET" && path === "/api/auth/config-check") {
        const report = await runConfigCheck(env);
        return jsonWithCors(report, request, env, report.ok ? 200 : 503);
      }

      /* ---------------- Rate limiting ---------------- */

      // Applied to abuse-prone endpoints. OTP also has D1 per-UID caps.
      const rateLimitedPaths: { match: RegExp; method: string; limit: number; window: number }[] = [
        { match: /^\/api\/auth\/(login|register)$/, method: "POST", limit: 15, window: 300 },
        { match: /^\/api\/auth\/send-otp$/, method: "POST", limit: 10, window: 300 },
        { match: /^\/api\/checkout$/, method: "POST", limit: 10, window: 60 },
        { match: /^\/api\/registrations$/, method: "POST", limit: 10, window: 300 },
      ];

      for (const rule of rateLimitedPaths) {
        if (request.method === rule.method && rule.match.test(path)) {
          const result = await rateLimit(
            env,
            `${rule.method}:${path}`,
            clientIp(request),
            rule.limit,
            rule.window
          );

          if (!result.allowed) {
            return jsonWithCors(
              {
                error: "Too many requests. Please try again shortly.",
                code: "rate_limited",
                retryAfter: result.retryAfter,
              },
              request,
              env,
              429
            );
          }
        }
      }

      /* ---------------- Giveaway ---------------- */

      if (path.startsWith("/api/giveaway")) {
        // Identity: verified session user, else a stable guest id.
        let userId: string | null = null;
        const sessionToken = readToken(request);

        if (sessionToken) {
          const user = await findUserByToken(env, sessionToken);
          userId = user?.id ?? null;
        }

        const guestId =
          request.headers.get("x-guest-id")?.trim().slice(0, 200) || null;
        const identity = { userId, guestId: userId ? null : guestId };

        if (request.method === "GET" && path === "/api/giveaway") {
          return jsonWithCors(
            await getGiveawayStatus(env, identity),
            request,
            env
          );
        }

        if (request.method === "POST" && path === "/api/giveaway/redeem") {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const result = await redeemGiveaway(env, identity, {
            email: typeof body.email === "string" ? body.email : "",
            name: typeof body.name === "string" ? body.name : "",
          });

          if ("error" in result) {
            return jsonWithCors(
              { error: result.error, status: result.statusCode },
              request,
              env,
              result.status
            );
          }

          return jsonWithCors(result, request, env);
        }

        return jsonWithCors({ error: "Not found." }, request, env, 404);
      }

      /* ---------------- Support chat ---------------- */

      const chatSession = request.headers.get("x-chat-session")?.trim() ?? "";

      if (path.startsWith("/api/chat")) {
        if (!chatSession || chatSession.length > 200) {
          return jsonWithCors(
            { error: "Invalid chat session." },
            request,
            env,
            400
          );
        }

        if (request.method === "GET" && path === "/api/chat") {
          let messages = await listMessages(env, chatSession);

          if (messages.length === 0) {
            const greeting = greetingMessage();
            await appendMessage(env, chatSession, "assistant", greeting);
            messages = await listMessages(env, chatSession);
          }

          return jsonWithCors({ messages }, request, env);
        }

        if (request.method === "POST" && path === "/api/chat") {
          const body = await readJson(request);
          const question = typeof body?.message === "string" ? body.message.trim() : "";

          if (!question) {
            return jsonWithCors({ error: "Write a message first." }, request, env, 400);
          }

          await appendMessage(env, chatSession, "user", question);

          // Load recent history so the AI can follow the conversation.
          const history = await listMessages(env, chatSession);
          const result = await answerQuestion(env, question, history);
          await appendMessage(env, chatSession, "assistant", result.answer);

          return jsonWithCors(result, request, env);
        }

        if (request.method === "DELETE" && path === "/api/chat") {
          await clearMessages(env, chatSession);
          return jsonWithCors({ ok: true }, request, env);
        }

        return jsonWithCors({ error: "Not found." }, request, env, 404);
      }

      /* ---------------- Cart API ---------------- */

      const cartId = request.headers.get("x-cart-id")?.trim() ?? "";

      if (path.startsWith("/api/cart")) {
        if (!cartId || cartId.length > 200) {
          return jsonWithCors({ error: "Invalid cart identifier." }, request, env, 400);
        }

        // Cart/checkout requires a signed-in user.
        let userId: string | null = null;
        let userEmail: string | null = null;
        const sessionToken = readToken(request);

        if (sessionToken) {
          const user = await findUserByToken(env, sessionToken);
          userId = user?.id ?? null;
          userEmail = user?.email ?? null;
        }

        if (!userId) {
          return jsonWithCors({ error: "Sign in required.", code: "auth_required" }, request, env, 401);
        }

        if (request.method === "GET" && path === "/api/cart") {
          const items = await getCart(env, cartId, userId);
          return jsonWithCors({ items }, request, env);
        }

        if (request.method === "POST" && path === "/api/cart") {
          const body = await readJson(request);
          if (!body) return jsonWithCors({ error: "Invalid request." }, request, env, 400);

          const result = await addToCart(env, cartId, body.item ?? body, userId, userEmail);
          if ("error" in result) {
            return jsonWithCors({ error: result.error }, request, env, 400);
          }
          return jsonWithCors(result, request, env);
        }

        if (request.method === "PATCH" && path === "/api/cart") {
          const body = await readJson(request);
          if (!body || typeof body.id !== "string") {
            return jsonWithCors({ error: "Item id is required." }, request, env, 400);
          }

          const result = await updateCartItem(
            env, cartId, body.id, Number(body.quantity), userId
          );
          if ("error" in result) {
            return jsonWithCors({ error: result.error }, request, env, 400);
          }
          return jsonWithCors(result, request, env);
        }

        if (request.method === "DELETE" && path === "/api/cart") {
          const result = await clearCart(env, cartId, userId);
          return jsonWithCors(result, request, env);
        }

        const cartItemMatch = path.match(/^\/api\/cart\/([^/]+)$/);

        if (request.method === "DELETE" && cartItemMatch) {
          const result = await removeFromCart(
            env, cartId, decodeURIComponent(cartItemMatch[1]), userId
          );
          return jsonWithCors(result, request, env);
        }

        return jsonWithCors({ error: "Not found." }, request, env, 404);
      }

      /* ---------------- Public products ---------------- */

      if (request.method === "GET" && path === "/api/products") {
        const products = await listPublishedProducts(env);
        return jsonWithCors({ products }, request, env);
      }

      const publicProductMatch = path.match(/^\/api\/products\/([^/]+)$/);

      if (request.method === "GET" && publicProductMatch) {
        const product = await getProduct(env, publicProductMatch[1]);

        if (!product || !product.published) {
          return jsonWithCors({ error: "Product not found." }, request, env, 404);
        }

        return jsonWithCors({ product }, request, env);
      }

      const imageMatch = path.match(/^\/api\/images\/(.+)$/);

      if (request.method === "GET" && imageMatch) {
        const key = decodeURIComponent(imageMatch[1]);
        const response = await serveImage(env, key);

        if (!response) {
          return jsonWithCors({ error: "Image not found." }, request, env, 404);
        }

        // Add CORS headers to the streamed response.
        for (const [name, value] of Object.entries(corsHeaders(request, env))) {
          response.headers.set(name, value);
        }

        return response;
      }

      /* ---------------- Public web config ---------------- */

      if (request.method === "GET" && path === "/api/config") {
        let webConfig: Record<string, string> = {};

        if (env.FIREBASE_CONFIG) {
          try {
            const parsed = parseFirebaseConfig(env.FIREBASE_CONFIG);
            webConfig = {
              apiKey: parsed.apiKey ?? "",
              authDomain: parsed.authDomain ?? "",
              projectId: parsed.projectId ?? "",
              storageBucket: parsed.storageBucket ?? "",
              messagingSenderId: parsed.messagingSenderId ?? "",
              appId: parsed.appId ?? "",
              measurementId: parsed.measurementId ?? "",
            };
          } catch {
            // Fall through with an empty config.
          }
        }

        return jsonWithCors({ firebase: webConfig }, request, env);
      }

      /* ---------------- Public catalogs ---------------- */

      const publicCatalogMatch = path.match(/^\/api\/(laptops|consoles)$/);

      if (request.method === "GET" && publicCatalogMatch) {
        const kind = publicCatalogMatch[1] as CatalogKind;
        const items = await listCatalogItems(env, kind, true);
        return jsonWithCors({ items }, request, env);
      }

      const publicCatalogItemMatch = path.match(
        /^\/api\/(laptops|consoles)\/([^/]+)$/
      );

      if (request.method === "GET" && publicCatalogItemMatch) {
        const kind = publicCatalogItemMatch[1] as CatalogKind;
        const item = await getCatalogItem(env, kind, publicCatalogItemMatch[2]);

        if (!item || !item.published) {
          return jsonWithCors({ error: "Product not found." }, request, env, 404);
        }

        return jsonWithCors({ item }, request, env);
      }

      if (request.method === "POST" && path === "/api/promo/validate") {
        let payload: { code?: unknown; lineId?: unknown } | null = null;

        try {
          payload = (await request.json()) as { code?: unknown; lineId?: unknown };
        } catch {
          payload = null;
        }

        const code = typeof payload?.code === "string" ? payload.code : "";
        const lineId = typeof payload?.lineId === "string" ? payload.lineId : "";

        const promo = code && lineId ? await lookupPromo(env, code, [lineId]) : null;

        if (!promo) {
          return jsonWithCors({ error: "Invalid promo code." }, request, env, 404);
        }

        return jsonWithCors({ promo }, request, env);
      }

      if (request.method === "GET" && path === "/api/me/promo") {
        const token = readToken(request);

        if (!token) {
          return jsonWithCors({ error: "Not signed in." }, request, env, 401);
        }

        const { auth } = await ensureInitialized(env);

        let uid: string;

        try {
          uid = (await auth.verifyIdToken(token, true)).uid;
        } catch {
          return jsonWithCors({ error: "Invalid session." }, request, env, 401);
        }

        const promo = await getUserPromo(env, uid);

        return jsonWithCors(
          { promo: promo?.active ? promo : null },
          request,
          env
        );
      }

      /* ---------------- Admin API ---------------- */

      if (path.startsWith("/api/admin/")) {
        const guard = await adminGuard(request, env, jsonWithCors);

        if (!guard.authorized) return guard.response;

        // GET /api/admin/giveaway — giveaway status
        if (request.method === "GET" && path === "/api/admin/giveaway") {
          const status = await getGiveawayStatus(env, { userId: null, guestId: null });
          return jsonWithCors(status, request, env);
        }

        // PUT /api/admin/giveaway — set closing timer and/or prize
        if (request.method === "PUT" && path === "/api/admin/giveaway") {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          if (typeof body.closesAt === "string" && body.closesAt.trim()) {
            const closing = await setGiveawayClosing(env, body.closesAt);
            if (!closing.ok) {
              return jsonWithCors({ error: closing.error }, request, env, 400);
            }
          }

          if ("prize" in body) {
            const prizeResult = body.prize === null
              ? await clearGiveawayPrize(env)
              : await setGiveawayPrize(env, body.prize);
            if (!prizeResult.ok) {
              return jsonWithCors({ error: prizeResult.error }, request, env, 400);
            }
            return jsonWithCors(prizeResult, request, env);
          }

          const status = await getGiveawayStatus(env, { userId: null, guestId: null });
          return jsonWithCors({ ok: true, status }, request, env);
        }

        // GET /api/admin/orders
        if (request.method === "GET" && path === "/api/admin/orders") {
          const result = await listAdminOrders(env, url);
          return jsonWithCors(result, request, env);
        }

        // GET /api/admin/orders/stats
        if (request.method === "GET" && path === "/api/admin/orders/stats") {
          const stats = await getAdminOrderStats(env);
          return jsonWithCors(stats, request, env);
        }

        // GET /api/admin/orders/:id
        const adminOrderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);

        if (request.method === "GET" && adminOrderMatch) {
          const order = await getAdminOrder(env, adminOrderMatch[1]);

          if (!order) {
            return jsonWithCors({ error: "Order not found." }, request, env, 404);
          }

          return jsonWithCors(order, request, env);
        }

        // PATCH /api/admin/orders/:id/status
        const adminStatusMatch = path.match(
          /^\/api\/admin\/orders\/([^/]+)\/status$/
        );

        if (request.method === "PATCH" && adminStatusMatch) {
          const body = await readJson(request);

          if (!body || typeof body.status !== "string") {
            return jsonWithCors({ error: "Status is required." }, request, env, 400);
          }

          const result = await updateAdminOrderStatus(
            env,
            adminStatusMatch[1],
            body.status
          );

          if (!result.ok) {
            return jsonWithCors({ error: "Invalid status." }, request, env, 400);
          }

          if (result.notFound) {
            return jsonWithCors({ error: "Order not found." }, request, env, 404);
          }

          return jsonWithCors({ ok: true, status: body.status }, request, env);
        }

        // POST /api/admin/orders/:id/wire-details — forward bank account to customer
        const adminWireMatch = path.match(
          /^\/api\/admin\/orders\/([^/]+)\/wire-details$/
        );

        if (request.method === "POST" && adminWireMatch) {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const details: WireDetails = {
            bankName: typeof body.bankName === "string" ? body.bankName : "",
            accountNumber:
              typeof body.accountNumber === "string" ? body.accountNumber : "",
            beneficiary: typeof body.beneficiary === "string" ? body.beneficiary : "",
            routing: typeof body.routing === "string" ? body.routing : undefined,
            swift: typeof body.swift === "string" ? body.swift : undefined,
            reference: typeof body.reference === "string" ? body.reference : undefined,
          };

          const result = await applyWireDetails(env, adminWireMatch[1], details);

          if (!result.ok) {
            return jsonWithCors(
              { error: result.error },
              request,
              env,
              result.status
            );
          }

          return jsonWithCors(
            { ok: true, session: result.session },
            request,
            env
          );
        }

        /* ---- Crypto wallets ---- */

        if (request.method === "GET" && path === "/api/admin/wallets") {
          const wallets = await listWallets(env, false);
          return jsonWithCors({ wallets }, request, env);
        }

        if (request.method === "POST" && path === "/api/admin/wallets") {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const result = await createWallet(env, {
            label: String(body.label ?? ""),
            network: String(body.network ?? ""),
            currency: String(body.currency ?? ""),
            address: String(body.address ?? ""),
            active: body.active !== false,
          });

          if (!result.ok) {
            return jsonWithCors({ error: result.error }, request, env, 400);
          }

          return jsonWithCors({ wallet: result.wallet }, request, env, 201);
        }

        const adminWalletMatch = path.match(/^\/api\/admin\/wallets\/([^/]+)$/);

        if (request.method === "PATCH" && adminWalletMatch) {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const patch: Record<string, unknown> = {};
          if (typeof body.label === "string") patch.label = body.label;
          if (typeof body.network === "string") patch.network = body.network;
          if (typeof body.currency === "string") patch.currency = body.currency;
          if (typeof body.address === "string") patch.address = body.address;
          if (typeof body.active === "boolean") patch.active = body.active;

          const result = await updateWallet(env, adminWalletMatch[1], patch);

          if (!result.ok) {
            return jsonWithCors(
              { error: result.error },
              request,
              env,
              result.status ?? 400
            );
          }

          return jsonWithCors({ wallet: result.wallet }, request, env);
        }

        if (request.method === "DELETE" && adminWalletMatch) {
          const result = await deleteWallet(env, adminWalletMatch[1]);

          if (result.notFound) {
            return jsonWithCors({ error: "Wallet not found." }, request, env, 404);
          }

          return jsonWithCors({ ok: true }, request, env);
        }

        /* ---- Bank accounts (wire destinations) ---- */

        if (request.method === "GET" && path === "/api/admin/bank-accounts") {
          const accounts = await listBankAccounts(env, false);
          return jsonWithCors({ accounts }, request, env);
        }

        if (request.method === "POST" && path === "/api/admin/bank-accounts") {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const result = await createBankAccount(env, {
            label: String(body.label ?? ""),
            bankName: String(body.bankName ?? ""),
            accountNumber: String(body.accountNumber ?? ""),
            beneficiary: String(body.beneficiary ?? ""),
            routing: typeof body.routing === "string" ? body.routing : "",
            swift: typeof body.swift === "string" ? body.swift : "",
            currency: typeof body.currency === "string" ? body.currency : "USD",
            active: body.active !== false,
          });

          if (!result.ok) {
            return jsonWithCors({ error: result.error }, request, env, 400);
          }

          return jsonWithCors({ account: result.account }, request, env, 201);
        }

        const adminBankMatch = path.match(/^\/api\/admin\/bank-accounts\/([^/]+)$/);

        if (request.method === "PATCH" && adminBankMatch) {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const patch: Record<string, unknown> = {};
          if (typeof body.label === "string") patch.label = body.label;
          if (typeof body.bankName === "string") patch.bankName = body.bankName;
          if (typeof body.accountNumber === "string")
            patch.accountNumber = body.accountNumber;
          if (typeof body.beneficiary === "string") patch.beneficiary = body.beneficiary;
          if (typeof body.routing === "string") patch.routing = body.routing;
          if (typeof body.swift === "string") patch.swift = body.swift;
          if (typeof body.currency === "string") patch.currency = body.currency;
          if (typeof body.active === "boolean") patch.active = body.active;

          const result = await updateBankAccount(env, adminBankMatch[1], patch);

          if (!result.ok) {
            return jsonWithCors(
              { error: result.error },
              request,
              env,
              result.status ?? 400
            );
          }

          return jsonWithCors({ account: result.account }, request, env);
        }

        if (request.method === "DELETE" && adminBankMatch) {
          const result = await deleteBankAccount(env, adminBankMatch[1]);

          if (result.notFound) {
            return jsonWithCors(
              { error: "Bank account not found." },
              request,
              env,
              404
            );
          }

          return jsonWithCors({ ok: true }, request, env);
        }

        /* ---- Users ---- */

        if (request.method === "GET" && path === "/api/admin/users") {
          const result = await listAdminUsers(env, url);
          return jsonWithCors(result, request, env);
        }

        if (request.method === "GET" && path === "/api/admin/users/stats") {
          const stats = await getAdminUserStats(env);
          return jsonWithCors(stats, request, env);
        }

        const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);

        if (request.method === "GET" && adminUserMatch) {
          const user = await getAdminUser(env, adminUserMatch[1]);

          if (!user) {
            return jsonWithCors({ error: "User not found." }, request, env, 404);
          }

          return jsonWithCors(user, request, env);
        }

        /* ---- User promos ---- */

        const adminUserPromoMatch = path.match(
          /^\/api\/admin\/users\/([^/]+)\/promo$/
        );

        if (request.method === "GET" && adminUserPromoMatch) {
          const promo = await getUserPromo(env, adminUserPromoMatch[1]);
          return jsonWithCors({ promo }, request, env);
        }

        if (request.method === "POST" && adminUserPromoMatch) {
          const body = await readJson(request);

          if (!body || typeof body.code !== "string") {
            return jsonWithCors({ error: "Code is required." }, request, env, 400);
          }

          const result = await assignUserPromo(
            env,
            adminUserPromoMatch[1],
            body.code,
            Number(body.discount)
          );

          if ("error" in result) {
            return jsonWithCors({ error: result.error }, request, env, 400);
          }

          return jsonWithCors({ promo: result }, request, env, 201);
        }

        if (request.method === "DELETE" && adminUserPromoMatch) {
          await deleteUserPromo(env, adminUserPromoMatch[1]);
          return jsonWithCors({ ok: true }, request, env);
        }

        const adminUserPromoActiveMatch = path.match(
          /^\/api\/admin\/users\/([^/]+)\/promo\/active$/
        );

        if (request.method === "PATCH" && adminUserPromoActiveMatch) {
          const body = await readJson(request);

          if (!body || typeof body.active !== "boolean") {
            return jsonWithCors({ error: "active must be a boolean." }, request, env, 400);
          }

          const updated = await setUserPromoActive(
            env,
            adminUserPromoActiveMatch[1],
            body.active
          );

          if (!updated) {
            return jsonWithCors({ error: "No promo assigned." }, request, env, 404);
          }

          return jsonWithCors({ ok: true, active: body.active }, request, env);
        }

        const adminUserVerifyMatch = path.match(
          /^\/api\/admin\/users\/([^/]+)\/verify$/
        );

        if (request.method === "PATCH" && adminUserVerifyMatch) {
          const uid = adminUserVerifyMatch[1];

          await env.DB.prepare(
            "UPDATE users SET email_verified = 1 WHERE id = ?1"
          )
            .bind(uid)
            .run();

          try {
            const { auth: firebaseAuth } = await ensureInitialized(env);
            await firebaseAuth.updateUser(uid, { emailVerified: true });
          } catch {
            // D1 is authoritative for the storefront; continue if Firebase
            // could not be updated.
          }

          return jsonWithCors({ ok: true }, request, env);
        }

        /* ---- Admin allowlist ---- */

        if (request.method === "GET" && path === "/api/admin/admins") {
          const admins = await listAdmins(env);
          return jsonWithCors({ admins }, request, env);
        }

        if (request.method === "POST" && path === "/api/admin/admins") {
          const body = await readJson(request);

          if (!body || typeof body.email !== "string") {
            return jsonWithCors({ error: "Email is required." }, request, env, 400);
          }

          const result = await addAdmin(env, body.email, guard.auth.email);

          if (!result.ok) {
            return jsonWithCors({ error: result.error }, request, env, result.status);
          }

          return jsonWithCors({ ok: true, email: result.email }, request, env, 201);
        }

        const adminEmailMatch = path.match(/^\/api\/admin\/admins\/([^/]+)$/);

        if (request.method === "DELETE" && adminEmailMatch) {
          const email = decodeURIComponent(adminEmailMatch[1]);

          // Prevent lockout: an admin cannot remove themselves, and the last
          // admin cannot be removed.
          if (email.toLowerCase() === guard.auth.email.toLowerCase()) {
            return jsonWithCors(
              { error: "You cannot remove your own admin access." },
              request,
              env,
              400
            );
          }

          if ((await countAdmins(env)) <= 1) {
            return jsonWithCors(
              { error: "The last admin cannot be removed." },
              request,
              env,
              400
            );
          }

          const result = await removeAdmin(env, email);

          if (result.notFound) {
            return jsonWithCors({ error: "Admin not found." }, request, env, 404);
          }

          return jsonWithCors({ ok: true }, request, env);
        }

        /* ---- Products ---- */

        if (request.method === "POST" && path === "/api/admin/promo-code") {
          return jsonWithCors({ code: generateUserPromoCode() }, request, env);
        }

        if (request.method === "GET" && path === "/api/admin/products") {
          const products = await listAllProducts(env);
          return jsonWithCors({ products }, request, env);
        }

        if (request.method === "POST" && path === "/api/admin/products") {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const validation = validateProductInput(body);

          if (!validation.ok) {
            return jsonWithCors({ error: validation.error }, request, env, 400);
          }

          const id = crypto.randomUUID();
          const product = await createProduct(env, id, validation.input);

          return jsonWithCors({ product }, request, env, 201);
        }

        const adminProductMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);

        if (request.method === "GET" && adminProductMatch) {
          const product = await getProduct(env, adminProductMatch[1]);

          if (!product) {
            return jsonWithCors({ error: "Product not found." }, request, env, 404);
          }

          return jsonWithCors({ product }, request, env);
        }

        if (request.method === "PATCH" && adminProductMatch) {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const validation = validateProductInput(body);

          if (!validation.ok) {
            return jsonWithCors({ error: validation.error }, request, env, 400);
          }

          const product = await updateProduct(
            env,
            adminProductMatch[1],
            validation.input
          );

          if (!product) {
            return jsonWithCors({ error: "Product not found." }, request, env, 404);
          }

          return jsonWithCors({ product }, request, env);
        }

        if (request.method === "DELETE" && adminProductMatch) {
          const product = await getProduct(env, adminProductMatch[1]);

          if (!product) {
            return jsonWithCors({ error: "Product not found." }, request, env, 404);
          }

          await deleteProduct(env, product.id);
          await deleteImage(env, product.image);
          for (const url of product.images ?? []) {
            await deleteImage(env, url);
          }

          return jsonWithCors({ ok: true }, request, env);
        }

        const adminPublishMatch = path.match(
          /^\/api\/admin\/products\/([^/]+)\/publish$/
        );

        if (request.method === "PATCH" && adminPublishMatch) {
          const body = await readJson(request);

          if (!body || typeof body.published !== "boolean") {
            return jsonWithCors({ error: "published must be a boolean." }, request, env, 400);
          }

          const updated = await setPublished(
            env,
            adminPublishMatch[1],
            body.published
          );

          if (!updated) {
            return jsonWithCors({ error: "Product not found." }, request, env, 404);
          }

          return jsonWithCors({ ok: true, published: body.published }, request, env);
        }

        /* ---- Image upload ---- */

        if (request.method === "POST" && path === "/api/admin/upload") {
          const contentType = request.headers.get("content-type") ?? "";

          if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
            return jsonWithCors(
              { error: "multipart/form-data is required." },
              request,
              env,
              415
            );
          }

          const formData = await request.formData();
          const file = formData.get("file");

          if (!(file instanceof File)) {
            return jsonWithCors({ error: "No file provided." }, request, env, 400);
          }

          const result = await uploadImage(env, file);

          if (!result.ok) {
            return jsonWithCors({ error: result.error }, request, env, result.status);
          }

          return jsonWithCors(
            { url: result.url, key: result.key },
            request,
            env,
            201
          );
        }

        /* ---- Catalog CRUD (laptops / consoles) ---- */

        const adminCatalogMatch = path.match(
          /^\/api\/admin\/(laptops|consoles)$/
        );

        if (request.method === "GET" && adminCatalogMatch) {
          const items = await listCatalogItems(
            env,
            adminCatalogMatch[1] as CatalogKind,
            false
          );
          return jsonWithCors({ items }, request, env);
        }

        if (request.method === "POST" && adminCatalogMatch) {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const id = typeof body.id === "string" && body.id.trim()
            ? body.id.trim()
            : crypto.randomUUID();
          const data = (body.data ?? body) as Record<string, unknown>;
          const item = await saveCatalogItem(
            env,
            adminCatalogMatch[1] as CatalogKind,
            id,
            data
          );

          return jsonWithCors({ item }, request, env, 201);
        }

        const adminCatalogItemMatch = path.match(
          /^\/api\/admin\/(laptops|consoles)\/([^/]+)$/
        );

        if (request.method === "GET" && adminCatalogItemMatch) {
          const item = await getCatalogItem(
            env,
            adminCatalogItemMatch[1] as CatalogKind,
            adminCatalogItemMatch[2]
          );

          if (!item) {
            return jsonWithCors({ error: "Item not found." }, request, env, 404);
          }

          return jsonWithCors({ item }, request, env);
        }

        if (request.method === "PATCH" && adminCatalogItemMatch) {
          const body = await readJson(request);

          if (!body) {
            return jsonWithCors({ error: "Invalid request." }, request, env, 400);
          }

          const data = (body.data ?? body) as Record<string, unknown>;
          const item = await saveCatalogItem(
            env,
            adminCatalogItemMatch[1] as CatalogKind,
            adminCatalogItemMatch[2],
            data
          );

          return jsonWithCors({ item }, request, env);
        }

        if (request.method === "DELETE" && adminCatalogItemMatch) {
          const removed = await deleteCatalogItem(
            env,
            adminCatalogItemMatch[1] as CatalogKind,
            adminCatalogItemMatch[2]
          );

          if (!removed) {
            return jsonWithCors({ error: "Item not found." }, request, env, 404);
          }

          return jsonWithCors({ ok: true }, request, env);
        }

        const adminCatalogPublishMatch = path.match(
          /^\/api\/admin\/(laptops|consoles)\/([^/]+)\/publish$/
        );

        if (request.method === "PATCH" && adminCatalogPublishMatch) {
          const body = await readJson(request);

          if (!body || typeof body.published !== "boolean") {
            return jsonWithCors(
              { error: "published must be a boolean." },
              request,
              env,
              400
            );
          }

          const updated = await setCatalogPublished(
            env,
            adminCatalogPublishMatch[1] as CatalogKind,
            adminCatalogPublishMatch[2],
            body.published
          );

          if (!updated) {
            return jsonWithCors({ error: "Item not found." }, request, env, 404);
          }

          return jsonWithCors(
            { ok: true, published: body.published },
            request,
            env
          );
        }

        return jsonWithCors({ error: "Not found." }, request, env, 404);
      }

      if (request.method === "GET" && path === "/api/health") {
        return json({ ok: true, provider: "manual", time: new Date().toISOString() });
      }

      if (request.method === "POST" && path === "/api/auth/register") {
        return await handleRegister(request, env);
      }

      if (request.method === "POST" && path === "/api/auth/login") {
        return await handleLogin(request, env);
      }

      if (request.method === "POST" && path === "/api/auth/logout") {
        return await handleLogout(request, env);
      }

      if (request.method === "GET" && path === "/api/me") {
        return await handleMe(request, env);
      }

      if (request.method === "PATCH" && path === "/api/me") {
        return await handleUpdateMe(request, env);
      }

      if (request.method === "GET" && path === "/api/me/orders") {
        return await handleUserOrders(request, env);
      }

      if (request.method === "GET" && path === "/api/me/settings") {
        return await handleSettings(request, env);
      }

      if (request.method === "PATCH" && path === "/api/me/settings") {
        return await handleSettings(request, env);
      }

      if (request.method === "GET" && path === "/api/me/products") {
        return await handleProducts(request, env);
      }

      if (request.method === "POST" && path === "/api/me/products") {
        return await handleProducts(request, env);
      }

      const productMatch = path.match(/^\/api\/me\/products\/([^/]+)$/);

      if (request.method === "DELETE" && productMatch) {
        return await handleDeleteProduct(request, env, productMatch[1]);
      }

      if (request.method === "GET" && path === "/api/wallets") {
        const wallets = await listActiveWallets(env);
        return json({ wallets });
      }

      if (request.method === "POST" && path === "/api/checkout/send-otp") {
        const body = await readJson(request);
        const email = typeof body?.email === "string" ? body.email : "";
        const result = await sendCheckoutOtp(env, email);
        if (!result.ok) return json({ error: result.error }, result.status);
        return json({ ok: true });
      }

      if (request.method === "POST" && path === "/api/checkout/verify-otp") {
        const body = await readJson(request);
        const email = typeof body?.email === "string" ? body.email : "";
        const otp = typeof body?.otp === "string" ? body.otp : "";
        const result = await verifyCheckoutOtp(env, email, otp);
        if (!result.ok) return json({ error: result.error }, result.status);
        return json({ ok: true });
      }

      if (request.method === "POST" && path === "/api/checkout") {
        const payload = (await request.json().catch(() => null)) as CheckoutRequest | null;

        if (!payload) {
          return json({ error: "Invalid checkout request." }, 400);
        }

        const sessionToken = readToken(request);
        const authedUser = sessionToken ? await findUserByToken(env, sessionToken) : null;
        if (!authedUser) {
          return json({ error: "Sign in required.", code: "auth_required" }, 401);
        }

        const email = typeof payload.details?.email === "string" ? payload.details.email : "";
        if (!(await isCheckoutOtpVerified(env, email))) {
          return json({ error: "Email verification required before checkout.", code: "checkout_otp_required" }, 403);
        }

        const result = await createCheckout(env, request, payload);

        if (!result.ok) {
          return json({ error: result.error }, result.status);
        }

        return json(result.session, 201);
      }

      const sessionMatch = path.match(/^\/api\/checkout\/([^/]+)$/);

      if (request.method === "GET" && sessionMatch) {
        const session = await getSessionById(env, sessionMatch[1]);

        if (!session) {
          return json({ error: "Checkout session not found." }, 404);
        }

        return json(session);
      }

      const cardMatch = path.match(/^\/api\/checkout\/([^/]+)\/card$/);

      if (request.method === "POST" && cardMatch) {
        const body = (await request.json().catch(() => null)) as
          | Record<string, unknown>
          | null;

        if (!body) {
          return json({ error: "Invalid request." }, 400);
        }

        const result = await submitCardPayment(env, cardMatch[1], body);

        if (!result.ok) {
          // Include the session when the rail marked it failed so the UI can
          // flip to the "try crypto/wire" panel without a second fetch.
          return json(
            {
              error: result.error,
              ...("session" in result && result.session
                ? { session: result.session }
                : {}),
            },
            result.status
          );
        }

        return json({ status: result.session.status, session: result.session });
      }

      const confirmMatch = path.match(/^\/api\/checkout\/([^/]+)\/confirm$/);

      if (request.method === "POST" && confirmMatch) {
        const result = await confirmPaymentSent(env, confirmMatch[1]);

        if (!result.ok) {
          return json({ error: result.error }, result.status);
        }

        return json({ status: result.session.status, session: result.session });
      }

      const wireNotifyMatch = path.match(/^\/api\/checkout\/([^/]+)\/wire-notify$/);
      if (request.method === "POST" && wireNotifyMatch) {
        const result = await notifyWirePending(env, wireNotifyMatch[1]);
        if (!result.ok) return json({ error: result.error }, result.status);
        return json({ ok: true });
      }

      const proofMatch = path.match(/^\/api\/checkout\/([^/]+)\/proof$/);

      if (request.method === "POST" && proofMatch) {
        const body = (await request.json().catch(() => null)) as
          | Record<string, unknown>
          | null;

        if (!body) {
          return json({ error: "Invalid request." }, 400);
        }

        const result = await submitPaymentProof(env, proofMatch[1], body);

        if (!result.ok) {
          return json({ error: result.error }, result.status);
        }

        return json({ status: result.session.status, session: result.session });
      }

      const walletMatch = path.match(/^\/api\/checkout\/([^/]+)\/wallet$/);

      if (request.method === "POST" && walletMatch) {
        const body = (await request.json().catch(() => null)) as
          | Record<string, unknown>
          | null;
        if (!body) return json({ error: "Invalid request." }, 400);
        const result = await updateCheckoutWallet(env, walletMatch[1], body.walletId);
        if (!result.ok) return json({ error: result.error }, result.status);
        return json({ status: result.session.status, session: result.session });
      }

      if (request.method === "POST" && path === "/api/registrations") {
        return await handleRegistration(env, request);
      }

      if (request.method === "GET" && path === "/api/orders") {
        return await handleOrders(env, url);
      }
      if (request.method === "POST" && path === "/api/auth/send-otp") {
        return await handleSendOTP(request, env);
      }

      if (request.method === "POST" && path === "/api/auth/verify-otp") {
        return await handleVerifyOTP(request, env);
      }

      if (request.method === "POST" && path === "/api/auth/resend-otp") {
        return await handleResendOTP(request, env);
      }

      if (request.method === "GET" && path === "/api/auth/status") {
        return await handleOTPStatus(request, env);
      }

      if (request.method === "POST" && path === "/api/auth/delete") {
        return await handleDeleteAccount(request, env);
      }

      return json({ error: "Not found." }, 404);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Unexpected error." },
        500
      );
    }
  },

  async fetch(request: Request, env: Env) {
    // Add CORS headers to EVERY response, including handlers that use the
    // plain json() helper. Without this, browsers reject responses from
    // cross-origin calls even though the Worker processed them successfully.
    const response = await this.handleFetch(request, env);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(corsHeaders(request, env))) {
      headers.set(name, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(event: ScheduledEvent, env: Env) {
    const secret = env.CRON_SECRET;

    if (secret && event.cron !== secret) {
      return;
    }

    // Per-method session deadlines (card 15m / crypto 30m / wire 48h).
    await expireStaleSessions(env);

    // Clean up old OTP records.
    await env.DB.prepare("DELETE FROM email_otps WHERE expires_at < ?1").bind(
      Math.floor(Date.now() / 1000) - 24 * 60 * 60
    ).run();
  },
};

export default worker;