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

const SESSION_TTL_SECONDS = 60 * 60 * 48;
const supportEmail = "support@genericpcs.com";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS orders (
     id TEXT PRIMARY KEY,
     reference TEXT NOT NULL,
     checkout_id TEXT,
     email TEXT NOT NULL,
     name TEXT NOT NULL,
     phone TEXT,
     country TEXT,
     postal_code TEXT,
     method TEXT NOT NULL,
     network TEXT,
     subtotal REAL NOT NULL,
     shipping REAL NOT NULL,
     total REAL NOT NULL,
     currency TEXT NOT NULL,
     status TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email)`,
  `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`,
  `CREATE TABLE IF NOT EXISTS order_lines (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id TEXT NOT NULL,
     product_id TEXT NOT NULL,
     name TEXT NOT NULL,
     kind TEXT,
     price REAL NOT NULL,
     quantity INTEGER NOT NULL,
     FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS registrations (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     kind TEXT NOT NULL,
     name TEXT NOT NULL,
     order_number TEXT NOT NULL,
     purchased_on TEXT,
     label_number TEXT NOT NULL,
     tracking_number TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS registrations_email_idx ON registrations (email)`,
];

let schemaReady = false;

async function ensureSchema(env: Env) {
  if (schemaReady) return;

  for (const statement of SCHEMA_STATEMENTS) {
    await env.DB.prepare(statement).run();
  }

  const columns = await env.DB.prepare("PRAGMA table_info(orders)").all();

  if (!columns.results.some((column) => column.name === "checkout_id")) {
    await env.DB.prepare("ALTER TABLE orders ADD COLUMN checkout_id TEXT").run();
  }

  schemaReady = true;
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
  const statements: D1PreparedStatement[] = [];

  statements.push(
    env.DB.prepare(
      `INSERT INTO orders (id, reference, checkout_id, email, name, phone, country, postal_code, method, network, subtotal, shipping, total, currency, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`
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
        session.total,
        session.currency,
        session.status,
        session.createdAt
      )
  );

  for (const line of session.lines) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO order_lines (order_id, product_id, name, kind, price, quantity)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      ).bind(
        session.id,
        line.id,
        line.name,
        line.kind,
        line.price,
        line.quantity
      )
    );
  }

  await env.DB.batch(statements);
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

  await env.SESSIONS.put(
    session.id,
    JSON.stringify(session),
    { expirationTtl: SESSION_TTL_SECONDS }
  );
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
  const stored = await env.SESSIONS.get(id, "json");

  if (!stored) {
    return json({ error: "Checkout session not found." }, 404);
  }

  const session = stored as CheckoutSession;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return json({ ...session, status: "expired" });
  }

  return json(session);
}

async function handleSubmit(env: Env, id: string) {
  const stored = await env.SESSIONS.get(id, "json");

  if (!stored) {
    return json({ error: "Checkout session not found." }, 404);
  }

  const session = stored as CheckoutSession;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return json({ error: "Checkout session expired." }, 410);
  }

  const updated: CheckoutSession = { ...session, status: "submitted" };

  if (updated.instructions.checkoutId) {
    await confirmGatewayPayment(env, updated.instructions.checkoutId);
  }

  await env.SESSIONS.put(
    updated.id,
    JSON.stringify(updated),
    { expirationTtl: SESSION_TTL_SECONDS }
  );
  await env.DB.prepare(
    "UPDATE orders SET status = ?1 WHERE id = ?2"
  )
    .bind(updated.status, updated.id)
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
    `INSERT INTO registrations (id, email, kind, name, order_number, purchased_on, label_number, tracking_number, created_at)
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

  const order = (checkoutId
    ? await env.DB.prepare(
        "SELECT id, reference FROM orders WHERE checkout_id = ?1 LIMIT 1"
      )
        .bind(checkoutId)
        .first()
    : reference
      ? await env.DB.prepare(
          "SELECT id, reference FROM orders WHERE reference = ?1 LIMIT 1"
        )
          .bind(reference)
          .first()
      : null) as { id: string; reference: string } | null;

  if (!order) {
    return json({ ok: true, matched: false });
  }

  const status = statusFromBachsEvent(event);

  if (!status) {
    return json({ ok: true, matched: true, status: "ignored" });
  }

  const stored = (await env.SESSIONS.get(order.id, "json")) as
    | CheckoutSession
    | null;

  if (stored) {
    const updated: CheckoutSession = { ...stored, status };

    await env.SESSIONS.put(updated.id, JSON.stringify(updated), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status = ?1 WHERE id = ?2").bind(
      status,
      order.id
    ),
    env.DB.prepare("UPDATE user_orders SET status = ?1 WHERE id = ?2").bind(
      status,
      order.id
    ),
  ]);

  return json({ ok: true, matched: true, status });
}

async function handleOrders(env: Env, url: URL) {
  const email = url.searchParams.get("email");

  if (!email) {
    return json({ error: "email is required." }, 400);
  }

  const result = await env.DB.prepare(
    "SELECT id, reference, total, currency, method, status, created_at FROM orders WHERE email = ?1 ORDER BY created_at DESC LIMIT 50"
  )
    .bind(email)
    .all();

  return json({ orders: result.results ?? [] });
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "OPTIONS") {
      return json({});
    }

    try {
      if (path.startsWith("/api/")) {
        await ensureSchema(env);
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

    await env.DB.prepare(
      "UPDATE orders SET status = 'expired' WHERE status IN ('pending','awaiting_payment') AND created_at < ?1"
    )
      .bind(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .run();
  },
};

export default worker;
