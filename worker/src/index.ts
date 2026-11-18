import {
  attachOrderToUser,
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
  buildSession,
  confirmGatewayPayment,
  createCryptoInstructions,
  createWireInstructions,
  GatewayAuthError,
} from "./bachs";
import {
  cryptoNetworks,
  type CheckoutRequest,
  type CheckoutSession,
  type Env,
  type PaymentStatus,
  type RegisteredProductPayload,
} from "./types";
import { corsHeaders, isOriginAllowed } from "./cors";
import { runConfigCheck } from "./config-check";
import { parseFirebaseConfig } from "./auth";
import { adminGuard } from "./admin-auth";
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
import { recomputeCheckoutTotals } from "./pricing";
import { lookupPromo, roundMoney } from "./promo";
import { generatePromoCode } from "./admin-products";
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
const supportEmail = "support@genericpcs.com";

async function ensureUserSettings(env: Env, userId: string) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO user_settings
       (user_id, order_updates, drop_notifications, marketing_emails, language, currency)
     VALUES (?1, 1, 1, 0, 'English (Nigeria)', 'USD ($)')`
  )
    .bind(userId)
    .run();
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidRequest(payload: CheckoutRequest) {
  return Boolean(
    payload &&
      Array.isArray(payload.lines) &&
      payload.lines.length > 0 &&
      payload.details &&
      payload.details.email &&
      (payload.method === "crypto" || payload.method === "wire") &&
      readNumber(payload.total) > 0
  );
}

function gatewayFailure(error: unknown): { message: string; status: number } {
  const detail = error instanceof Error ? error.message : String(error);

  if (detail.includes("EMAIL_NOT_DELIVERABLE") || detail.includes("cannot receive mail")) {
    return {
      message:
        "That email address cannot receive mail, so we cannot issue a receipt or a payment notice. Use another address.",
      status: 400,
    };
  }

  if (detail.includes("DEPOSIT_LIMIT_EXCEEDED")) {
    const requested = detail.match(/"requested_amount":"?([\d.]+)"?/)?.[1];
    const limit = detail.match(/"max_allowed_amount":"?([\d.]+)"?/)?.[1];

    return {
      message:
        requested && limit
          ? `This order of $${requested} is above the $${limit} limit for a single payment. Split it into two orders or email ${supportEmail} to raise the limit.`
          : `This order is above the limit for a single payment. Split it into two orders or email ${supportEmail} to raise the limit.`,
      status: 400,
    };
  }

  return {
    message:
      "The payment gateway could not start this checkout. Please try again in a moment.",
    status: 502,
  };
}

async function persistOrder(env: Env, session: CheckoutSession) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO orders
       (id, reference, checkout_id, email, name, phone, country, postal_code,
        method, network, subtotal, shipping, discount, total, currency, promo_code, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`
  )
    .bind(
      session.id,
      session.reference,
      session.instructions.checkoutId || null,
      session.details.email,
      session.details.name,
      session.details.phone,
      session.details.country,
      session.details.postalCode,
      session.instructions.method,
      session.instructions.method === "crypto"
        ? session.instructions.network
        : null,
      session.subtotal,
      session.shipping,
      session.discount,
      session.total,
      session.currency,
      session.promoCode ?? null,
      session.status,
      session.createdAt
    )
    .run();

  const statements = session.lines.map((line) =>
    env.DB.prepare(
      `INSERT INTO order_lines
         (id, order_id, product_id, name, kind, price, quantity)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    ).bind(
      crypto.randomUUID(),
      session.id,
      line.id,
      line.name,
      line.kind,
      line.price,
      line.quantity
    )
  );

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}

function randomReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let code = "";

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return `PCM-${code}`;
}

async function handleCheckout(env: Env, request: Request) {
  const payload = (await request.json()) as CheckoutRequest;

  if (!isValidRequest(payload)) {
    return json({ error: "Invalid checkout request." }, 400);
  }

  // Recompute every amount from authoritative catalog prices before any
  // gateway interaction. Client-submitted prices/totals are never trusted.
  const priced = await recomputeCheckoutTotals(env, payload.lines);

  if ("error" in priced) {
    return json({ error: priced.error }, 400);
  }

  // Resolve any promo against D1. The discount rate always comes from the
  // stored product record, never from the client.
  let promoCode = "";
  let discount = 0;

  if (typeof payload.promoCode === "string" && payload.promoCode.trim()) {
    const promo = await lookupPromo(env, payload.promoCode, priced.lines.map((l) => l.id));

    if (promo) {
      promoCode = promo.code;
      discount = roundMoney((priced.subtotal * promo.discount) / 100);
    }
  }

  const discountedSubtotal = roundMoney(Math.max(0, priced.subtotal - discount));
  const shipping =
    discountedSubtotal >= 99 || discountedSubtotal === 0
      ? 0
      : priced.shipping;

  const trusted: CheckoutRequest = {
    ...payload,
    lines: priced.lines,
    subtotal: roundMoney(discountedSubtotal + discount),
    shipping,
    total: roundMoney(discountedSubtotal + shipping),
    promoCode: promoCode || undefined,
  };

  if (payload.method === "crypto") {
    const network = payload.network ?? "btc";

    if (!cryptoNetworks[network]) {
      return json({ error: "Unsupported crypto network." }, 400);
    }
  }

  const reference = randomReference();

  let warning: string | undefined;
  let instructions: CheckoutSession["instructions"];

  try {
    const created =
      payload.method === "crypto"
        ? await createCryptoInstructions(env, trusted, reference)
        : await createWireInstructions(env, trusted, reference);

    instructions = created.instructions;
    warning = created.warning;
  } catch (error) {
    if (error instanceof GatewayAuthError) {
      const fallback =
        payload.method === "crypto"
          ? await createCryptoInstructions(
              { ...env, BACHS_API_KEY: undefined, BACHS_API_BASE: undefined },
              trusted,
              reference
            )
          : await createWireInstructions(
              { ...env, BACHS_API_KEY: undefined, BACHS_API_BASE: undefined },
              trusted,
              reference
            );

      instructions = fallback.instructions;
      warning = `${fallback.warning ?? "Payment gateway unavailable."} (${error.message})`;
    } else {
      console.error("checkout gateway failure", error);

      const failure = gatewayFailure(error);

      return json({ error: failure.message }, failure.status);
    }
  }

  const session = buildSession(trusted, instructions, reference, warning);
  session.discount = discount;
  session.promoCode = promoCode || undefined;

  await persistOrder(env, session);

  // Cache the full session so GET /api/checkout/:id and "I have sent payment"
  // work. Written in the same request as the order.
  await env.DB.prepare(
    `INSERT OR REPLACE INTO checkout_sessions
       (id, reference, status, data, created_at, expires_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(
      session.id,
      session.reference,
      session.status,
      JSON.stringify(session),
      session.createdAt,
      session.expiresAt
    )
    .run();

  await attachOrderToUser(env, request, {
    id: session.id,
    reference: session.reference,
    lines: payload.lines,
    total: session.total,
    currency: session.currency,
    status: session.status,
    method: payload.method,
  });

  return json(session, 201);
}

async function handleSession(env: Env, id: string) {
  const row = await env.DB.prepare(
    "SELECT data, status, expires_at FROM checkout_sessions WHERE id = ?1"
  )
    .bind(id)
    .first<{ data: string; status: string; expires_at: string }>();

  if (!row) {
    return json({ error: "Checkout session not found." }, 404);
  }

  const session = JSON.parse(row.data) as CheckoutSession;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return json({ ...session, status: "expired" });
  }

  return json(session);
}

async function handleSubmit(env: Env, id: string) {
  const row = await env.DB.prepare(
    "SELECT data FROM checkout_sessions WHERE id = ?1"
  )
    .bind(id)
    .first<{ data: string }>();

  if (!row) {
    return json({ error: "Checkout session not found." }, 410);
  }

  const session = JSON.parse(row.data) as CheckoutSession;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return json({ error: "Checkout session expired." }, 410);
  }

  const updated: CheckoutSession = { ...session, status: "submitted" };

  if (updated.instructions.checkoutId) {
    await confirmGatewayPayment(env, updated.instructions.checkoutId);
  }

  await env.DB.prepare(
    "UPDATE checkout_sessions SET status = 'submitted', data = ?1 WHERE id = ?2"
  )
    .bind(JSON.stringify(updated), id)
    .run();

  await env.DB.prepare("UPDATE orders SET status = 'submitted' WHERE id = ?1")
    .bind(updated.id)
    .run();

  return json({ status: updated.status });
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

type BachsWebhookEvent = {
  id?: string;
  type?: string;
  created_at?: string;
  reference?: string | null;
  data?: {
    checkout_id?: string | null;
    reference?: string | null;
    status?: string | null;
    payment_status?: string | null;
    amount?: string | null;
    currency?: string | null;
  };
};

const WEBHOOK_TOLERANCE_SECONDS = 300;

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyBachsWebhook(env: Env, request: Request, raw: string) {
  const secret = env.BACHS_WEBHOOK_SECRET;

  // Fail closed: an unsigned webhook must never be accepted.
  if (!secret) {
    console.error("BACHS_WEBHOOK_SECRET is not configured; rejecting webhook.");
    return false;
  }

  const candidates: string[] = [];
  let timestamp = request.headers.get("x-bachs-timestamp") ?? "";

  const legacy = request.headers.get("x-bachs-signature");

  if (legacy?.trim()) {
    candidates.push(legacy.trim());
  }

  const v2 = request.headers.get("x-bachs-signature-v2") ?? "";

  for (const part of v2.split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=").trim();

    if (key?.trim() === "v1" && value) {
      candidates.push(value);
    }

    if (key?.trim() === "t" && value && !timestamp) {
      timestamp = value;
    }
  }

  if (!timestamp || candidates.length === 0) {
    return false;
  }

  const seconds = Number(timestamp);

  if (!Number.isFinite(seconds)) {
    return false;
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - seconds) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = await hmacHex(secret, `${timestamp}.${raw}`);

  return candidates.some((candidate) => candidate.toLowerCase() === expected);
}

function statusFromBachsEvent(event: BachsWebhookEvent): PaymentStatus | null {
  const type = (event.type ?? "").toLowerCase();
  const paymentStatus = (event.data?.payment_status ?? "").toLowerCase();
  const status = (event.data?.status ?? "").toLowerCase();

  if (
    type === "collection.succeeded" ||
    paymentStatus === "paid" ||
    status === "succeeded" ||
    status === "paid"
  ) {
    return "paid";
  }

  if (
    type === "collection.failed" ||
    paymentStatus === "failed" ||
    status === "failed"
  ) {
    return "failed";
  }

  return null;
}

async function handleWebhook(env: Env, request: Request) {
  const raw = await request.text();

  if (!(await verifyBachsWebhook(env, request, raw))) {
    return json({ error: "Invalid signature." }, 401);
  }

  let event: BachsWebhookEvent;

  try {
    event = JSON.parse(raw) as BachsWebhookEvent;
  } catch {
    return json({ error: "Invalid payload." }, 400);
  }

  const checkoutId = event.data?.checkout_id ?? undefined;
  const reference = event.data?.reference ?? event.reference ?? undefined;

  const orderRow = (checkoutId
    ? await env.DB.prepare("SELECT id, reference FROM orders WHERE checkout_id = ?1 LIMIT 1")
        .bind(checkoutId)
        .first<{ id: string; reference: string }>()
    : reference
      ? await env.DB.prepare("SELECT id, reference FROM orders WHERE reference = ?1 LIMIT 1")
          .bind(reference)
          .first<{ id: string; reference: string }>()
      : null);

  if (!orderRow) {
    return json({ ok: true, matched: false });
  }

  const status = statusFromBachsEvent(event);

  if (!status) {
    return json({ ok: true, matched: true, status: "ignored" });
  }

  // Idempotency: ignore replayed webhook events so a stale event cannot
  // overwrite a later fulfilment status (shipped/delivered).
  if (event.id) {
    try {
      await env.DB.prepare(
        "INSERT INTO webhook_events (id, type, created_at) VALUES (?1, ?2, ?3)"
      )
        .bind(event.id, event.type ?? "unknown", new Date().toISOString())
        .run();
    } catch {
      return json({ ok: true, matched: true, duplicate: true });
    }
  }

  const newStatus: PaymentStatus = status;

  await env.DB.prepare("UPDATE orders SET status = ?1 WHERE id = ?2")
    .bind(newStatus, orderRow.id)
    .run();

  await env.DB.prepare("UPDATE user_orders SET status = ?1 WHERE id = ?2")
    .bind(newStatus, orderRow.id)
    .run();

  // Mirror the status into any cached checkout session.
  const sessionRow = await env.DB.prepare(
    "SELECT data FROM checkout_sessions WHERE id = ?1"
  )
    .bind(orderRow.id)
    .first<{ data: string }>();

  if (sessionRow) {
    try {
      const session = JSON.parse(sessionRow.data) as CheckoutSession;
      session.status = status;

      await env.DB.prepare(
        "UPDATE checkout_sessions SET status = ?1, data = ?2 WHERE id = ?3"
      )
        .bind(status, JSON.stringify(session), orderRow.id)
        .run();
    } catch {
      // Ignore malformed cached sessions.
    }
  }

  return json({ ok: true, matched: true, status });
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
  async fetch(request: Request, env: Env) {
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

      /* ---------------- Admin API ---------------- */

      if (path.startsWith("/api/admin/")) {
        const guard = await adminGuard(request, env, jsonWithCors);

        if (!guard.authorized) return guard.response;

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
          return jsonWithCors({ code: generatePromoCode() }, request, env);
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
        return json({ ok: true, provider: "bachs", time: new Date().toISOString() });
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

      if (request.method === "POST" && path === "/api/checkout") {
        return await handleCheckout(env, request);
      }

      const sessionMatch = path.match(/^\/api\/checkout\/([^/]+)$/);

      if (request.method === "GET" && sessionMatch) {
        return await handleSession(env, sessionMatch[1]);
      }

      const submitMatch = path.match(/^\/api\/checkout\/([^/]+)\/submit$/);

      if (request.method === "POST" && submitMatch) {
        return await handleSubmit(env, submitMatch[1]);
      }

      if (request.method === "POST" && path === "/api/webhooks/bachs") {
        return await handleWebhook(env, request);
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

  async scheduled(event: ScheduledEvent, env: Env) {
    const secret = env.CRON_SECRET;

    if (secret && event.cron !== secret) {
      return;
    }

    const cutoff = new Date(
      Date.now() - 48 * 60 * 60 * 1000
    ).toISOString();

    // Expire stale orders and clean up old OTP records.
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders SET status = 'expired'
          WHERE status IN ('pending', 'awaiting_payment') AND created_at < ?1`
      ).bind(cutoff),
      env.DB.prepare("DELETE FROM email_otps WHERE expires_at < ?1").bind(
        Math.floor(Date.now() / 1000) - 24 * 60 * 60
      ),
    ]);
  },






};

export default worker;