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
import { sendVerificationEmail } from "./email";
import {
  checkOTPStatus,
  ensureInitialized,
  readToken,
  generateSixDigitOTP,
  invalidateOTP,
  markEmailVerified,
  storeOTP,
  verifyOTP,
} from "./auth";

const SESSION_TTL_SECONDS = 60 * 60 * 48;

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
  const { firestore: db } = await ensureInitialized(env);
  if (!db) return;

  const docRef = db.collection("user_settings").doc(userId);
  const snap = await docRef.get();

  if (!snap.exists) {
    await docRef.set({
      order_updates: true,
      drop_notifications: true,
      marketing_emails: false,
      language: "English (Nigeria)",
      currency: "USD ($)",
    });
  }
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
  const { firestore: db } = await ensureInitialized(env);
  if (!db) return;

  await db.collection("orders").doc(session.id).set({
    id: session.id,
    reference: session.reference,
    checkout_id: session.instructions.checkoutId || null,
    email: session.details.email,
    name: session.details.name,
    phone: session.details.phone,
    country: session.details.country,
    postal_code: session.details.postalCode,
    method: session.instructions.method,
    network: session.instructions.method === "crypto"
      ? session.instructions.network
      : null,
    subtotal: session.subtotal,
    shipping: session.shipping,
    total: session.total,
    currency: session.currency,
    status: session.status,
    created_at: session.createdAt,
  });

  const batch = db.batch();

  for (const line of session.lines) {
    const lineRef = db.collection("order_lines").doc();
    batch.set(lineRef, {
      id: lineRef.id,
      order_id: session.id,
      product_id: line.id,
      name: line.name,
      kind: line.kind,
      price: line.price,
      quantity: line.quantity,
    });
  }

  await batch.commit();
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
        ? await createCryptoInstructions(env, payload, reference)
        : await createWireInstructions(env, payload, reference);

    instructions = created.instructions;
    warning = created.warning;
  } catch (error) {
    if (error instanceof GatewayAuthError) {
      const fallback =
        payload.method === "crypto"
          ? await createCryptoInstructions(
              { ...env, BACHS_API_KEY: undefined, BACHS_API_BASE: undefined },
              payload,
              reference
            )
          : await createWireInstructions(
              { ...env, BACHS_API_KEY: undefined, BACHS_API_BASE: undefined },
              payload,
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

  const session = buildSession(payload, instructions, reference, warning);

  await persistOrder(env, session);
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
  const { firestore: db } = await ensureInitialized(env);
  if (!db) return json({ error: "Database not configured." }, 500);

  const doc = await db.collection("checkout_sessions").doc(id).get();

  if (!doc.exists) {
    return json({ error: "Checkout session not found." }, 404);
  }

  const session = doc.data() as CheckoutSession;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return json({ ...session, status: "expired" });
  }

  return json(session);
}

async function handleSubmit(env: Env, id: string) {
  const { firestore: db } = await ensureInitialized(env);
  if (!db) return json({ error: "Database not configured." }, 500);

  const doc = await db.collection("checkout_sessions").doc(id).get();

  if (!doc.exists) {
    return json({ error: "Checkout session not found." }, 410);
  }

  const session = doc.data() as CheckoutSession;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return json({ error: "Checkout session expired." }, 410);
  }

  const updated: CheckoutSession = { ...session, status: "submitted" };

  if (updated.instructions.checkoutId) {
    await confirmGatewayPayment(env, updated.instructions.checkoutId);
  }

  await db.collection("checkout_sessions").doc(id).update({ status: "submitted" });
  await db.collection("orders").doc(updated.id).update({ status: "submitted" });

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

  await (await ensureInitialized(env)).firestore.collection("registrations").doc().set({
    id: crypto.randomUUID(),
    email: payload.email,
    kind: payload.kind,
    name: payload.name,
    order_number: payload.orderNumber,
    purchased_on: payload.purchasedOn ?? "",
    label_number: labelNumber,
    tracking_number: trackingNumber,
    created_at: new Date().toISOString(),
  });

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

  if (!secret) {
    return true;
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

  const orderDoc = (checkoutId
    ? await (await ensureInitialized(env)).firestore.collection("orders").doc(checkoutId).get()
    : reference
      ? await (await ensureInitialized(env)).firestore.collection("orders").where("reference", "==", reference).limit(1).get()
      : null) as FirebaseFirestore.DocumentSnapshot | null;

  if (!orderDoc || !orderDoc.exists) {
    return json({ ok: true, matched: false });
  }

  const status = statusFromBachsEvent(event);

  if (!status) {
    return json({ ok: true, matched: true, status: "ignored" });
  }

  const orderData = orderDoc.data();

  const updatedSession: CheckoutSession = {
    id: orderDoc.id,
    provider: "bachs",
    status,
    reference: orderData?.reference ?? "",
    createdAt: orderData?.created_at ?? "",
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    subtotal: orderData?.subtotal ?? 0,
    shipping: orderData?.shipping ?? 0,
    total: orderData?.total ?? 0,
    currency: orderData?.currency ?? "USD",
    lines: [],
    details: {
      name: orderData?.name ?? "",
      email: orderData?.email ?? "",
      phone: orderData?.phone ?? "",
      country: orderData?.country ?? "",
      postalCode: orderData?.postal_code ?? "",
    },
    instructions: {
      method: orderData?.method ?? "crypto",
      network: orderData?.network ?? "btc",
      currency: orderData?.currency ?? "USD",
      billingCurrency: orderData?.currency ?? "USD",
      amount: orderData?.total ?? "0",
      confirmations: 2,
      checkoutId: orderDoc.id,
      checkoutUrl: "",
      availableMethods: ["CRYPTO", "NGN_BANK_TRANSFER"],
      excludedMethods: [],
    },
    gatewayWarning: undefined,
  };

  await (await ensureInitialized(env)).firestore.collection("checkout_sessions").doc(orderDoc.id).set(updatedSession);

  await (await ensureInitialized(env)).firestore.collection("orders").doc(orderDoc.id).update({ status: status === "paid" ? "paid" : "submitted" });

  await (await ensureInitialized(env)).firestore.collection("user_orders").where("id", "==", orderDoc.id).get().then((snapshot) => {
    snapshot?.docs.forEach((doc) => {
      doc.ref.update({ status: status === "paid" ? "paid" : "submitted" });
    });
  });

  return json({ ok: true, matched: true, status });
}

async function handleOrders(env: Env, url: URL) {
  const email = url.searchParams.get("email");

  if (!email) {
    return json({ error: "email is required." }, 400);
  }

  const ordersSnap = await (await ensureInitialized(env)).firestore.collection("orders")
    .where("email", "==", email)
    .orderBy("created_at", "desc")
    .limit(50)
    .get();

  const orders = (ordersSnap?.docs ?? []).map((doc) => ({
    id: doc.id,
    reference: doc.data().reference,
    total: doc.data().total,
    currency: doc.data().currency,
    method: doc.data().method,
    status: doc.data().status,
    created_at: doc.data().created_at,
  }));

  return json({ orders });
}

async function handleVerifyEmail(request: Request, env: Env) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const token = searchParams.get("token") as string;
  const email = searchParams.get("email") as string;

  if (!token || !email) {
    return jsonWithCors({ error: "Missing token or email." }, request, env, 400);
  }

  const { firestore: db } = await ensureInitialized(env);
  if (!db) return jsonWithCors({ error: "Database not configured." }, request, env, 500);

  const snap = await db.collection("users").where("email", "==", email).limit(1).get();

  if (snap.empty) {
    return jsonWithCors({ alreadyVerified: true }, request, env);
  }

  const userDoc = snap.docs[0];
  await userDoc.ref.update({ email_verified: 1 });

  return jsonWithCors({ verified: true }, request, env);
}

async function handleSendOTP(request: Request, env: Env) {
  const body = await readJson(request);

  if (!body) return jsonWithCors({ error: "Invalid request." }, request, env, 400);

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return jsonWithCors({ error: "Missing Firebase ID token." }, request, env, 401);
  }

  try {
    const { auth: firebaseAuth, firestore: db } = await ensureInitialized(env);

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

    await db.collection("users").doc(uid).update({ email_verified: 0 });

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
    const { auth: firebaseAuth, firestore: db } = await ensureInitialized(env);

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

    await db.collection("users").doc(uid).update({ email_verified: 1 });

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
  const { auth: firebaseAuth, firestore: db } = await ensureInitialized(env);

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

  await db.collection("users").doc(uid).delete();
  await db.collection("email_otps").doc(uid).delete();

  await db.collection("user_sessions").where("user_id", "==", uid).get().then((snapshot) => {
    snapshot.docs.forEach((doc) => doc.ref.delete());
  });
  await db.collection("user_orders").where("user_id", "==", uid).get().then((snapshot) => {
    snapshot.docs.forEach((doc) => doc.ref.delete());
  });
  await db.collection("user_products").where("user_id", "==", uid).get().then((snapshot) => {
    snapshot.docs.forEach((doc) => doc.ref.delete());
  });
  await db.collection("user_settings").doc(uid).delete();

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
      if (request.method === "GET" && path === "/api/auth/verify") {
        return await handleVerifyEmail(request, env);
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

    const { firestore: db } = await ensureInitialized(env);
    if (!db) return;

    const snapshot = await db.collection("orders").get();

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      const createdAt = doc.data().created_at;
      if (
        createdAt &&
        new Date(createdAt as string).getTime() < Date.now() - 48 * 60 * 60 * 1000
      ) {
        batch.update(doc.ref, { status: "expired" });
      }
    });

    await batch.commit();
  },






};

export default worker;