import { attachOrderToUser } from "./account";
import { ensureInitialized, findUserByToken, readToken } from "./auth";
import { getWallet, listWallets } from "./admin-wallets";
import {
  customerAndSupportRecipients,
  notifyAdminsPaymentEvent,
  sendReceiptEmail,
  sendWireDetailsEmail,
  sendWireRequestEmail,
  type AdminPaymentAlertInput,
  type ReceiptLine,
} from "./email";
import { recomputeCheckoutTotals, parseLineId } from "./pricing";
import { lookupPromo, roundMoney } from "./promo";
import { getUserPromoByCode } from "./user-promo";
import {
  cryptoNetworks,
  METHOD_TTL_MS,
  PAYMENT_METHODS,
  TERMINAL_STATUSES,
  type CardSummary,
  type CheckoutRequest,
  type CheckoutSession,
  type CryptoWallet,
  type Env,
  type PaymentStatus,
  type WireDetails,
} from "./types";

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function customerName(details: CheckoutSession["details"]) {
  const explicit = `${details.firstName ?? ""} ${details.lastName ?? ""}`.trim();
  return explicit || String(details.name ?? "").trim() || "Customer";
}

function postalCode(details: CheckoutSession["details"]) {
  return String(details.zipCode ?? details.postalCode ?? "").trim();
}

function isValidRequest(payload: CheckoutRequest) {
  const details = payload?.details;
  const hasLegacy = Boolean(details?.name && (details?.postalCode || details?.zipCode));
  const hasNew = Boolean(
    details?.firstName &&
      details?.lastName &&
      details?.address &&
      details?.city &&
      details?.state &&
      (details?.zipCode || details?.postalCode) &&
      details?.country &&
      details?.phone
  );
  return Boolean(
    payload &&
      Array.isArray(payload.lines) &&
      payload.lines.length > 0 &&
      details?.email &&
      (hasLegacy || hasNew) &&
      payload.method &&
      PAYMENT_METHODS.has(payload.method) &&
      readNumber(payload.total) > 0
  );
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

function randomSessionId() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let code = "";

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return `chs_${code}`;
}

/** True when the session has passed its deadline and should be cancelled. */
export function shouldExpireSession(
  session: CheckoutSession,
  now = Date.now()
): boolean {
  if (TERMINAL_STATUSES.has(session.status)) return false;

  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt > now) return false;

  // Card: the timer cancels the whole operation, including a submitted card
  // that the admin has not approved yet.
  if (session.method === "card") return true;

  // Crypto / wire: only pre-confirmation states expire. Once the user says
  // they have paid, the admin may approve later.
  return (
    session.status === "pending" ||
    session.status === "awaiting_payment" ||
    session.status === "awaiting_admin"
  );
}

async function persistOrder(env: Env, session: CheckoutSession) {
  const instructions = session.instructions;
  const walletId =
    instructions.method === "crypto" ? instructions.walletId : null;
  const wireDetails =
    instructions.method === "wire" ? (instructions.wireDetails ?? null) : null;

  const safe = <T>(v: T | undefined | null): T | null => (v === undefined ? null : v);
  await env.DB.prepare(
    `INSERT OR REPLACE INTO orders
       (id, reference, checkout_id, email, name, phone, country, postal_code,
        method, network, subtotal, shipping, discount, total, currency, promo_code,
        status, created_at, card_summary, wallet_id, wire_details, expires_at, payment_proof)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)`
  )
    .bind(
      session.id,
      session.reference,
      session.id,
      session.details.email ?? null,
      customerName(session.details),
      session.details.phone ?? null,
      session.details.country ?? null,
      postalCode(session.details) || null,
      session.method,
      instructions.method === "crypto" ? instructions.network : null,
      session.subtotal ?? 0,
      session.shipping ?? 0,
      session.discount ?? 0,
      session.total ?? 0,
      session.currency ?? "USD",
      session.promoCode ?? session.discountCode ?? null,
      session.status,
      session.createdAt,
      session.cardSummary ? JSON.stringify(session.cardSummary) : null,
      walletId ?? null,
      wireDetails ? JSON.stringify(wireDetails) : null,
      session.expiresAt ?? null,
      session.paymentProof ? JSON.stringify(session.paymentProof) : null
    )
    .run();

  const statements = session.lines.map((line) =>
    env.DB.prepare(
      `INSERT INTO order_lines
         (order_id, product_id, name, kind, price, quantity)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(
      session.id,
      line.id ?? null,
      line.name ?? null,
      line.kind ?? null,
      line.price ?? 0,
      line.quantity ?? 1
    )
  );

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }
}

async function saveSession(env: Env, session: CheckoutSession) {
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
}

async function syncSessionStatus(env: Env, session: CheckoutSession) {
  await env.DB.prepare(
    `UPDATE checkout_sessions
        SET status = ?1, data = ?2, expires_at = ?3
      WHERE id = ?4`
  )
    .bind(session.status, JSON.stringify(session), session.expiresAt ?? null, session.id)
    .run();

  await env.DB.prepare(
    `UPDATE orders
        SET status = ?1,
            card_summary = ?2,
            wire_details = ?3,
            expires_at = ?4,
            receipt_sent_at = ?5,
            payment_proof = ?6
      WHERE id = ?7`
  )
    .bind(
      session.status,
      session.cardSummary ? JSON.stringify(session.cardSummary) : null,
      session.instructions.method === "wire" && session.instructions.wireDetails
        ? JSON.stringify(session.instructions.wireDetails)
        : session.wireDetails
          ? JSON.stringify(session.wireDetails)
          : null,
      session.expiresAt,
      session.receiptSentAt ?? null,
      session.paymentProof ? JSON.stringify(session.paymentProof) : null,
      session.id
    )
    .run();

  await env.DB.prepare(
    "UPDATE user_orders SET status = ?1 WHERE id = ?2"
  )
    .bind(session.status, session.id)
    .run();
}

async function loadSessionRow(
  env: Env,
  id: string
): Promise<{ data: string; status: string; expires_at: string } | null> {
  return env.DB.prepare(
    "SELECT data, status, expires_at FROM checkout_sessions WHERE id = ?1"
  )
    .bind(id)
    .first<{ data: string; status: string; expires_at: string }>();
}

async function markExpired(env: Env, session: CheckoutSession) {
  const expired: CheckoutSession = { ...session, status: "expired" };
  await syncSessionStatus(env, expired);
  return expired;
}

/** Loads a session, applying lazy expiry when the deadline has passed. */
async function getLiveSession(
  env: Env,
  id: string
): Promise<CheckoutSession | null> {
  const row = await loadSessionRow(env, id);
  if (!row) return null;

  let session: CheckoutSession;
  try {
    session = JSON.parse(row.data) as CheckoutSession;
  } catch {
    return null;
  }

  if (shouldExpireSession(session)) {
    return markExpired(env, session);
  }

  return session;
}

export function detectCardBrand(number: string): string {
  const digits = number.replace(/\D/g, "");

  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  if (/^(30[0-5]|3[69])/.test(digits)) return "Diners";
  if (/^(35[2-8])/.test(digits)) return "JCB";
  return "Card";
}

export function luhnValid(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 12) return false;

  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }

  return sum % 10 === 0;
}

/** Builds the only card fields we ever persist — never the full PAN/CVV. */
export function maskCardSummary(input: {
  number: string;
  expMonth: string;
  expYear: string;
  holderName: string;
}): CardSummary {
  const digits = input.number.replace(/\D/g, "");
  return {
    brand: detectCardBrand(digits),
    last4: digits.slice(-4),
    expMonth: String(input.expMonth).padStart(2, "0"),
    expYear: String(input.expYear).slice(-2),
    holderName: input.holderName.trim(),
  };
}

export type CardSubmitResult =
  | { ok: true; session: CheckoutSession }
  | { ok: false; status: number; error: string; session?: CheckoutSession };

/**
 * Card payments are a placeholder rail and always fail.
 * The session is marked `failed` so the customer can switch to crypto/wire.
 */
export async function submitCardPayment(
  env: Env,
  id: string,
  _body?: Record<string, unknown>
): Promise<CardSubmitResult> {
  void _body;
  const current = await getLiveSession(env, id);

  if (!current) {
    return { ok: false, status: 410, error: "Checkout session expired." };
  }

  if (current.method !== "card") {
    return { ok: false, status: 400, error: "This order is not a card payment." };
  }

  if (current.status === "paid") {
    return { ok: false, status: 409, error: "This payment is already approved." };
  }

  if (current.status === "failed") {
    return {
      ok: false,
      status: 409,
      error: CARD_PAYMENT_UNAVAILABLE,
      session: current,
    };
  }

  if (current.status === "submitted") {
    return { ok: false, status: 409, error: "Card details are already under review." };
  }

  if (
    current.status !== "awaiting_payment" &&
    current.status !== "pending"
  ) {
    return { ok: false, status: 409, error: "This card payment is not accepting details." };
  }

  // Placeholder rail: never accepts a charge — fail and free the customer
  // to pick crypto or wire instead.
  const failed: CheckoutSession = { ...current, status: "failed" };
  await syncSessionStatus(env, failed);

  return {
    ok: false,
    status: 402,
    error: CARD_PAYMENT_UNAVAILABLE,
    session: failed,
  };
}

/** Shown to the customer whenever the card rail rejects a submission. */
export const CARD_PAYMENT_UNAVAILABLE =
  "Card payment is unavailable right now. Please pay with crypto or wire transfer instead.";

export type ConfirmResult =
  | { ok: true; session: CheckoutSession }
  | { ok: false; status: number; error: string };

/** User asserts the crypto/wire transfer has been sent. */
export async function confirmPaymentSent(
  env: Env,
  id: string
): Promise<ConfirmResult> {
  const current = await getLiveSession(env, id);

  if (!current) {
    return { ok: false, status: 410, error: "Checkout session expired." };
  }

  if (current.method === "card") {
    return {
      ok: false,
      status: 400,
      error: "Card payments are confirmed with the card form, not this button.",
    };
  }

  if (current.status === "paid") {
    return { ok: false, status: 409, error: "This payment is already approved." };
  }

  if (current.status === "submitted") {
    return { ok: false, status: 409, error: "We already have your payment note." };
  }

  if (current.method === "wire" && !current.wireDetails) {
    return {
      ok: false,
      status: 409,
      error: "Bank details have not been provided yet.",
    };
  }

  if (
    current.status !== "awaiting_payment" &&
    current.status !== "awaiting_admin" &&
    current.status !== "pending"
  ) {
    return { ok: false, status: 409, error: "This payment is not awaiting confirmation." };
  }

  // Re-check the deadline: crypto/wire must be confirmed inside the window.
  if (shouldExpireSession({ ...current, status: "awaiting_payment" })) {
    await markExpired(env, current);
    return { ok: false, status: 410, error: "Checkout session expired." };
  }

  const updated: CheckoutSession = { ...current, status: "submitted" };
  await syncSessionStatus(env, updated);

  const walletLabel =
    updated.instructions.method === "crypto"
      ? updated.instructions.walletLabel
      : null;

  void notifyAdminsPaymentEvent(env, {
    kind: updated.method,
    reference: updated.reference,
    amount: updated.total,
    currency: updated.currency,
    customerName: customerName(updated.details),
    customerEmail: updated.details.email,
    detail:
      updated.method === "crypto"
        ? `Transfer claimed to ${walletLabel ?? "wallet"} — awaiting approval`
        : "Bank transfer claimed — awaiting approval",
  } satisfies AdminPaymentAlertInput);

  return { ok: true, session: updated };
}

/** Customer submits proof of payment (tx hash / transfer reference) and is marked submitted. */
export async function submitPaymentProof(
  env: Env,
  id: string,
  payload: { txHash?: unknown; note?: unknown }
): Promise<ConfirmResult> {
  const current = await getLiveSession(env, id);

  if (!current) {
    return { ok: false, status: 410, error: "Checkout session expired." };
  }

  if (current.method === "card") {
    return {
      ok: false,
      status: 400,
      error: "Card payments do not use a proof-of-payment step.",
    };
  }

  if (current.status === "paid") {
    return { ok: false, status: 409, error: "This payment is already approved." };
  }

  if (current.status === "submitted") {
    return {
      ok: false,
      status: 409,
      error: "Your proof of payment has already been received.",
    };
  }

  if (current.method === "wire" && !current.wireDetails) {
    return {
      ok: false,
      status: 409,
      error: "Bank details have not been provided yet.",
    };
  }

  if (
    current.status !== "awaiting_payment" &&
    current.status !== "awaiting_admin" &&
    current.status !== "pending"
  ) {
    return {
      ok: false,
      status: 409,
      error: "This payment is not awaiting confirmation.",
    };
  }

  if (shouldExpireSession({ ...current, status: "awaiting_payment" })) {
    await markExpired(env, current);
    return { ok: false, status: 410, error: "Checkout session expired." };
  }

  const txHash = String(payload.txHash ?? "").trim();
  const noteRaw = String(payload.note ?? "").trim();

  if (!txHash || txHash.length > 200) {
    return {
      ok: false,
      status: 400,
      error: "Enter the transaction hash or transfer reference (max 200 characters).",
    };
  }

  if (noteRaw.length > 500) {
    return { ok: false, status: 400, error: "Note is too long (max 500 characters)." };
  }

  const paymentProof = {
    txHash,
    note: noteRaw || undefined,
    submittedAt: new Date().toISOString(),
  };

  const updated: CheckoutSession = {
    ...current,
    status: "submitted",
    paymentProof,
  };

  await syncSessionStatus(env, updated);

  const walletLabel =
    updated.instructions.method === "crypto"
      ? updated.instructions.walletLabel
      : null;

  void notifyAdminsPaymentEvent(env, {
    kind: updated.method,
    reference: updated.reference,
    amount: updated.total,
    currency: updated.currency,
    customerName: customerName(updated.details),
    customerEmail: updated.details.email,
    detail:
      updated.method === "crypto"
        ? `Proof submitted for ${walletLabel ?? "wallet"} (tx ${txHash}) — awaiting approval`
        : `Proof of bank transfer submitted (ref ${txHash}) — awaiting approval`,
  } satisfies AdminPaymentAlertInput);

  return { ok: true, session: updated };
}

function cryptoAmount(total: number, network: keyof typeof cryptoNetworks): string {
  const config = cryptoNetworks[network];
  const amount = total / config.rate;
  return amount.toFixed(config.decimals);
}

export type CheckoutResult =
  | { ok: true; session: CheckoutSession }
  | { ok: false; status: number; error: string };

export async function createCheckout(
  env: Env,
  request: Request,
  payload: CheckoutRequest
): Promise<CheckoutResult> {
  const sessionToken = readToken(request);

  if (sessionToken) {
    const user = await findUserByToken(env, sessionToken);

    if (!user || !user.emailVerified) {
      return {
        ok: false,
        status: 403,
        error: "Please verify your email address before checking out.",
      };
    }
  }

  if (!isValidRequest(payload)) {
    return { ok: false, status: 400, error: "Invalid checkout request." };
  }

  const method = payload.method;

  const priced = await recomputeCheckoutTotals(env, payload.lines);

  if ("error" in priced) {
    return { ok: false, status: 400, error: priced.error };
  }

  const requestedDiscountCode = String(payload.discountCode ?? payload.promoCode ?? "").trim();
  let promoCode = "";
  let discount = 0;
  let discountCode: string | undefined;

  if (requestedDiscountCode) {
    const token = readToken(request);
    const lineIds = priced.lines.map((line) => line.id);
    const productPromo = await lookupPromo(env, requestedDiscountCode, lineIds);

    if (productPromo) {
      promoCode = productPromo.code;
      discountCode = productPromo.code;

      let productDiscount = 0;

      for (const line of priced.lines) {
        const parsed = parseLineId(line.id);

        if (!parsed) continue;
        if (parsed.kind !== productPromo.kind) continue;
        if (parsed.productId !== productPromo.productId) continue;

        productDiscount += line.price * line.quantity * (productPromo.discount / 100);
      }

      discount = roundMoney(productDiscount);
    } else if (token) {
      try {
        const { auth } = await ensureInitialized(env);
        const uid = (await auth.verifyIdToken(token, true)).uid;
        const promo = await getUserPromoByCode(env, uid, requestedDiscountCode);

        if (promo) {
          promoCode = promo.code;
          discountCode = promo.code;
          discount = roundMoney((priced.subtotal * promo.discount) / 100);
        }
      } catch {
        // Invalid/expired token: promo simply does not apply.
      }
    }
  }

  const discountedSubtotal = roundMoney(Math.max(0, priced.subtotal - discount));
  const deliveryMethod = payload.details.deliveryMethod === "express" ? "express" : "standard";
  const shipping = deliveryMethod === "express" ? 18 : 0;
  const tax = roundMoney(discountedSubtotal * 0.08);
  const total = roundMoney(discountedSubtotal + shipping + tax);

  const reference = randomReference();
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + METHOD_TTL_MS[method]).toISOString();
  const billingCurrency = payload.currency || "USD";

  let wallet: CryptoWallet | null = null;

  if (method === "crypto") {
    const walletId = String(payload.walletId ?? "").trim();

    if (!walletId) {
      return { ok: false, status: 400, error: "Choose a wallet to send the crypto to." };
    }

    wallet = await getWallet(env, walletId);

    if (!wallet || !wallet.active) {
      return { ok: false, status: 400, error: "That wallet is no longer available." };
    }
  }

  let status: PaymentStatus = "awaiting_payment";
  let instructions: CheckoutSession["instructions"];

  if (method === "card") {
    instructions = {
      method: "card",
      amount: total.toFixed(2),
      billingCurrency,
    };
  } else if (method === "crypto" && wallet) {
    instructions = {
      method: "crypto",
      walletId: wallet.id,
      walletLabel: wallet.label,
      network: wallet.network,
      currency: wallet.currency,
      address: wallet.address,
      amount: cryptoAmount(total, wallet.network),
      billingCurrency,
      confirmations: cryptoNetworks[wallet.network].confirmations,
    };
  } else {
    // Wire starts awaiting admin bank details.
    status = "awaiting_admin";
    instructions = {
      method: "wire",
      amount: total.toFixed(2),
      billingCurrency,
    };
  }

  const session: CheckoutSession = {
    id: randomSessionId(),
    status,
    reference,
    method,
    createdAt,
    expiresAt,
    subtotal: roundMoney(priced.subtotal),
    shipping,
    tax,
    discount,
    promoCode: promoCode || undefined,
    discountCode,
    total,
    currency: billingCurrency,
    lines: priced.lines.map((line) => ({
      id: line.id,
      name: line.name,
      kind: line.kind,
      price: line.price,
      quantity: line.quantity,
    })),
    details: {
      ...payload.details,
      deliveryMethod,
      marketingOptIn: Boolean(payload.details.marketingOptIn),
    },
    instructions,
    cardSummary: null,
    walletId: wallet?.id ?? null,
    wireDetails: null,
    receiptSentAt: null,
    paymentProof: null,
  };

  await persistOrder(env, session);
  await saveSession(env, session);

  await attachOrderToUser(env, request, {
    id: session.id,
    reference: session.reference,
    lines: session.lines,
    total: session.total,
    currency: session.currency,
    status: session.status,
    method: session.method,
  });

  if (method === "wire") {
    // Shopper asked for bank details — confirm to them and alert support/admins.
    if (env.RESEND_API_KEY && session.details.email) {
      void sendWireRequestEmail({
        apiKey: env.RESEND_API_KEY,
        to: session.details.email,
        reference: session.reference,
        customerName: customerName(session.details),
        amount: instructions.amount,
        currency: instructions.billingCurrency,
      }).catch((error) => {
        console.error("wire request email failed:", error);
      });
    }

    void notifyAdminsPaymentEvent(env, {
      kind: "wire",
      event: "requested",
      reference: session.reference,
      amount: session.total,
      currency: session.currency,
      customerName: customerName(session.details),
      customerEmail: session.details.email,
      detail: "Bank details requested — forward your account to the customer.",
    } satisfies AdminPaymentAlertInput);
  }

  return { ok: true, session };
}

export async function getSessionById(
  env: Env,
  id: string
): Promise<CheckoutSession | null> {
  return getLiveSession(env, id);
}

/** Admin sets wire bank details for an order; status moves to awaiting_payment. */
export async function applyWireDetails(
  env: Env,
  orderId: string,
  details: WireDetails
): Promise<{ ok: true; session: CheckoutSession } | { ok: false; status: number; error: string }> {
  const current = await getLiveSession(env, orderId);

  if (!current) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  if (current.method !== "wire") {
    return { ok: false, status: 400, error: "This order is not a wire transfer." };
  }

  if (current.status === "paid" || current.status === "submitted") {
    return {
      ok: false,
      status: 409,
      error: "This order has already moved past bank details.",
    };
  }

  const bankName = String(details.bankName ?? "").trim();
  const accountNumber = String(details.accountNumber ?? "").trim();
  const beneficiary = String(details.beneficiary ?? "").trim();

  if (!bankName || !accountNumber || !beneficiary) {
    return {
      ok: false,
      status: 400,
      error: "Bank name, account number and beneficiary are required.",
    };
  }

  const wireDetails: WireDetails = {
    bankName,
    accountNumber,
    beneficiary,
    routing: String(details.routing ?? "").trim() || undefined,
    swift: String(details.swift ?? "").trim() || undefined,
    reference: details.reference?.trim() || current.reference,
  };

  // Past the 48h window the wire session is dead.
  if (shouldExpireSession({ ...current, status: "awaiting_payment" })) {
    await markExpired(env, current);
    return { ok: false, status: 410, error: "Checkout session expired." };
  }

  const updated: CheckoutSession = {
    ...current,
    status: "awaiting_payment",
    wireDetails,
    instructions:
      current.instructions.method === "wire"
        ? { ...current.instructions, wireDetails }
        : current.instructions,
  };

  await syncSessionStatus(env, updated);

  // Forward the same bank-details email to the shopper and the ops inbox.
  if (env.RESEND_API_KEY && current.details.email) {
    void sendWireDetailsEmail({
      apiKey: env.RESEND_API_KEY,
      to: customerAndSupportRecipients(current.details.email),
      reference: current.reference,
      customerName: customerName(current.details),
      amount: current.instructions.amount,
      currency: current.instructions.billingCurrency,
      wireDetails,
    }).catch((error) => {
      console.error("wire details email failed:", error);
    });
  }

  void notifyAdminsPaymentEvent(env, {
    kind: "wire",
    event: "sent",
    reference: current.reference,
    amount: current.total,
    currency: current.currency,
    customerName: customerName(current.details),
    customerEmail: current.details.email,
    detail: "Bank details forwarded to the customer. Await proof of payment.",
  } satisfies AdminPaymentAlertInput);

  return { ok: true, session: updated };
}

/** Expires sessions past their deadline (cron + on-demand). */
export async function expireStaleSessions(env: Env): Promise<number> {
  const rows = await env.DB.prepare(
    `SELECT id, data FROM checkout_sessions
      WHERE status IN ('pending', 'awaiting_payment', 'awaiting_admin', 'submitted')
      LIMIT 200`
  ).all<{ id: string; data: string }>();

  let expired = 0;

  for (const row of rows.results ?? []) {
    try {
      const session = JSON.parse(row.data) as CheckoutSession;
      if (shouldExpireSession(session)) {
        await markExpired(env, session);
        expired += 1;
      }
    } catch {
      // Skip malformed cached sessions.
    }
  }

  // Also sweep orders that may lack a session row.
  const cutoff = new Date().toISOString();
  const orderResult = await env.DB.prepare(
    `UPDATE orders SET status = 'expired'
      WHERE expires_at IS NOT NULL
        AND expires_at < ?1
        AND method = 'card'
        AND status NOT IN ('paid', 'failed', 'expired', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')`
  )
    .bind(cutoff)
    .run();

  return expired + (orderResult.meta?.changes ?? 0);
}

/** Marks a session paid after admin approval and emails the receipt. */
export async function markSessionPaid(
  env: Env,
  orderId: string
): Promise<{ ok: true; session: CheckoutSession; receiptSent: boolean } | { ok: false; status: number; error: string }> {
  const current = await getLiveSession(env, orderId);

  if (!current) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  if (current.status === "paid") {
    return { ok: true, session: current, receiptSent: Boolean(current.receiptSentAt) };
  }

  const paidAt = new Date().toISOString();
  const receiptLines: ReceiptLine[] = current.lines.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    price: line.price,
  }));

  const updated: CheckoutSession = {
    ...current,
    status: "paid",
    receiptSentAt: current.receiptSentAt ?? paidAt,
  };

  await syncSessionStatus(env, updated);

  let receiptSent = false;

  if (env.RESEND_API_KEY && updated.details.email) {
    const result = await sendReceiptEmail({
      apiKey: env.RESEND_API_KEY,
      to: updated.details.email,
      reference: updated.reference,
      customerName: customerName(updated.details),
      lines: receiptLines,
      subtotal: updated.subtotal,
      shipping: updated.shipping,
      discount: updated.discount,
      total: updated.total,
      currency: updated.currency,
      method: updated.method,
      paidAt,
    });
    receiptSent = result.ok;
  }

  return { ok: true, session: updated, receiptSent };
}

export async function listActiveWallets(env: Env) {
  return listWallets(env, true);
}


