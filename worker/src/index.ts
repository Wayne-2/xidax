import {
  buildSession,
  createCryptoInstructions,
  createWireInstructions,
} from "./bachs";
import {
  cryptoNetworks,
  type CheckoutRequest,
  type CheckoutSession,
  type Env,
  type RegisteredProductPayload,
} from "./types";

const SESSION_TTL_SECONDS = 60 * 60 * 48;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS orders (
     id TEXT PRIMARY KEY,
     reference TEXT NOT NULL,
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

  schemaReady = true;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
  });
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

async function persistOrder(env: Env, session: CheckoutSession) {
  const statements: D1PreparedStatement[] = [];

  statements.push(
    env.DB.prepare(
      `INSERT INTO orders (id, reference, email, name, phone, country, postal_code, method, network, subtotal, shipping, total, currency, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
    )
      .bind(
        session.id,
        session.reference,
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

  const reference = `PCM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const instructions =
    payload.method === "crypto"
      ? await createCryptoInstructions(env, payload, reference)
      : await createWireInstructions(env, payload, reference);

  const session = buildSession(payload, instructions, reference);

  await env.SESSIONS.put(
    session.id,
    JSON.stringify(session),
    { expirationTtl: SESSION_TTL_SECONDS }
  );
  await persistOrder(env, session);

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

async function handleWebhook(env: Env, request: Request) {
  const raw = await request.text();
  const secret = env.BACHS_WEBHOOK_SECRET;

  if (secret) {
    const signature = request.headers.get("x-bachs-signature") ?? "";
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
      new TextEncoder().encode(raw)
    );
    const expected = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expected) {
      return json({ error: "Invalid signature." }, 401);
    }
  }

  const payload = JSON.parse(raw) as {
    id?: string;
    reference?: string;
    status?: string;
  };

  const status = payload.status ?? "paid";
  const sessionId = payload.id;

  if (sessionId) {
    const stored = await env.SESSIONS.get(sessionId, "json");

    if (stored) {
      const session = stored as CheckoutSession;
      const updated: CheckoutSession = { ...session, status: status as CheckoutSession["status"] };

      await env.SESSIONS.put(updated.id, JSON.stringify(updated), {
        expirationTtl: SESSION_TTL_SECONDS,
      });
      await env.DB.prepare("UPDATE orders SET status = ?1 WHERE id = ?2")
        .bind(updated.status, updated.id)
        .run();
    }
  }

  if (payload.reference) {
    await env.DB.prepare("UPDATE orders SET status = ?1 WHERE reference = ?2")
      .bind(status, payload.reference)
      .run();
  }

  return json({ ok: true });
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
