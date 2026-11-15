import {
  createPassword,
  createSession,
  ensureSettings,
  findUserByToken,
  readToken,
  toUser,
  verifyPassword,
} from "./auth";
import { resolveCustomer } from "./bachs";
import type { Env } from "./types";

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser(request: Request, env: Env) {
  const token = readToken(request);

  if (!token) return null;

  return findUserByToken(env, token);
}

export async function handleRegister(request: Request, env: Env) {
  const body = await readJson(request);

  if (!body) return json({ error: "Invalid request." }, 400);

  const email = text(body.email).toLowerCase();
  const name = text(body.name);
  const phone = text(body.phone);
  const country = text(body.country);
  const postalCode = text(body.postalCode);
  const password = text(body.password);

  if (!EMAIL_PATTERN.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  if (!name) {
    return json({ error: "Tell us what to call you." }, 400);
  }

  if (password.length < 8) {
    return json({ error: "Use at least 8 characters." }, 400);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?1"
  )
    .bind(email)
    .first<{ id: string }>();

  if (existing) {
    return json({ error: "An account already uses that email." }, 409);
  }

  const { salt, hash } = await createPassword(password);
  const userId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  let bachsCustomerId: string | null = null;

  try {
    const customer = await resolveCustomer(env, {
      email,
      name,
      phone,
      country,
      postalCode,
    });
    bachsCustomerId = customer.id;
  } catch {
    // bachs customer resolution failure does not prevent registration
    bachsCustomerId = null;
  }

  await env.DB.prepare(
    `INSERT INTO users (id, email, name, phone, country, postal_code, password_hash, password_salt, tier, bachs_customer_id, email_verified, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  )
    .bind(
      userId,
      email,
      name,
      phone,
      country,
      postalCode,
      hash,
      salt,
      "Member",
      bachsCustomerId,
      0,
      createdAt
    )
    .run();

  await ensureSettings(env, userId);

  const session = await createSession(env, userId);

  // Send verification email via Resend
  try {
    const verificationUrl = `https://generic-pcs-web.pcmarketweb.workers.dev/auth/verify?token=${session.token}&email=${encodeURIComponent(
      email
    )}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@generic-pcs.com",
        to: [email],
        subject: "Verify your email address",
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email address.</p><p>This link will expire in 24 hours.</p>`,
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      throw new Error(err || "Failed to send verification email");
    }
  } catch {
    // Verification email failure does not prevent account creation
  }

  return json(
    {
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: userId,
        email,
        name,
        phone,
        country,
        postalCode,
        tier: "Member",
        createdAt,
      },
    },
    201
  );
}

export async function handleLogin(request: Request, env: Env) {
  const body = await readJson(request);

  if (!body) return json({ error: "Invalid request." }, 400);

  const email = text(body.email).toLowerCase();
  const password = text(body.password);

  if (!email || !password) {
    return json({ error: "Enter your email and password." }, 400);
  }

  const row = await env.DB.prepare(
    "SELECT id, email, name, phone, country, postal_code, tier, bachs_customer_id, email_verified, created_at, password_hash, password_salt FROM users WHERE email = ?1"
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      tier: string | null;
      bachs_customer_id: string | null;
      email_verified: number;
      created_at: string;
      password_hash: string;
      password_salt: string;
    }>();

  if (!row) {
    return json({ error: "Those details do not match an account." }, 401);
  }

  const valid = await verifyPassword(
    password,
    row.password_salt,
    row.password_hash
  );

  if (!valid) {
    return json({ error: "Those details do not match an account." }, 401);
  }

  const session = await createSession(env, row.id);

  return json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: toUser(row),
  });
}

export async function handleLogout(request: Request, env: Env) {
  const token = readToken(request);

  if (token) {
    await env.DB.prepare("DELETE FROM user_sessions WHERE token = ?1")
      .bind(token)
      .run();
  }

  return json({ ok: true });
}

export async function handleMe(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  const settings = await ensureSettings(env, user.id);

  const counts = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM user_orders WHERE user_id = ?1) AS orders,
            (SELECT COUNT(*) FROM user_products WHERE user_id = ?1) AS products`
  )
    .bind(user.id)
    .first<{ orders: number; products: number }>();

  return json({ user, settings, counts: counts ?? { orders: 0, products: 0 } });
}

export async function handleUpdateMe(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  const body = await readJson(request);

  if (!body) return json({ error: "Invalid request." }, 400);

  const name = text(body.name) || user.name;
  const email = text(body.email).toLowerCase() || user.email;
  const phone = text(body.phone);
  const country = text(body.country);
  const postalCode = text(body.postalCode);

  if (!EMAIL_PATTERN.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  await env.DB.prepare(
    "UPDATE users SET name = ?1, email = ?2, phone = ?3, country = ?4, postal_code = ?5 WHERE id = ?6"
  )
    .bind(name, email, phone, country, postalCode, user.id)
    .run();

  const row = await env.DB.prepare(
    "SELECT id, email, name, phone, country, postal_code, tier, bachs_customer_id, email_verified, created_at FROM users WHERE id = ?1"
  )
    .bind(user.id)
    .first<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      tier: string | null;
      bachs_customer_id: string | null;
      email_verified: number;
      created_at: string;
    }>();

  return json({ user: toUser(row!) });
}

export async function handleSettings(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  if (request.method === "GET") {
    return json({ settings: await ensureSettings(env, user.id) });
  }

  const body = await readJson(request);

  if (!body) return json({ error: "Invalid request." }, 400);

  const current = await ensureSettings(env, user.id);
  const settings = {
    orderUpdates:
      typeof body.orderUpdates === "boolean"
        ? body.orderUpdates
        : current.orderUpdates,
    dropNotifications:
      typeof body.dropNotifications === "boolean"
        ? body.dropNotifications
        : current.dropNotifications,
    marketingEmails:
      typeof body.marketingEmails === "boolean"
        ? body.marketingEmails
        : current.marketingEmails,
    language: text(body.language) || current.language,
    currency: text(body.currency) || current.currency,
  };

  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, order_updates, drop_notifications, marketing_emails, language, currency)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(user_id) DO UPDATE SET
       order_updates = ?2, drop_notifications = ?3, marketing_emails = ?4, language = ?5, currency = ?6`
  )
    .bind(
      user.id,
      settings.orderUpdates ? 1 : 0,
      settings.dropNotifications ? 1 : 0,
      settings.marketingEmails ? 1 : 0,
      settings.language,
      settings.currency
    )
    .run();

  return json({ settings });
}

export async function handleUserOrders(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  const rows = await env.DB.prepare(
    "SELECT id, reference, title, detail, total, currency, status, method, created_at FROM user_orders WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50"
  )
    .bind(user.id)
    .all<{
      id: string;
      reference: string;
      title: string;
      detail: string | null;
      total: number;
      currency: string;
      status: string;
      method: string | null;
      created_at: string;
    }>();

  return json({
    orders: (rows.results ?? []).map((row) => ({
      id: row.id,
      reference: row.reference,
      title: row.title,
      detail: row.detail ?? "",
      total: row.total,
      currency: row.currency,
      status: row.status,
      method: row.method ?? "",
      createdAt: row.created_at,
    })),
  });
}

export async function handleProducts(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT id, kind, name, order_number, purchased_on, label_number, tracking_number, created_at FROM user_products WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50"
    )
      .bind(user.id)
      .all<{
        id: string;
        kind: string;
        name: string;
        order_number: string;
        purchased_on: string | null;
        label_number: string;
        tracking_number: string;
        created_at: string;
      }>();

    return json({
      products: (rows.results ?? []).map((row) => ({
        id: row.id,
        kind: row.kind,
        name: row.name,
        orderNumber: row.order_number,
        purchasedOn: row.purchased_on ?? "",
        labelNumber: row.label_number,
        trackingNumber: row.tracking_number,
        createdAt: row.created_at,
      })),
    });
  }

  const body = await readJson(request);

  if (!body) return json({ error: "Invalid request." }, 400);

  const kind = text(body.kind) === "laptop" ? "laptop" : "pc";
  const name = text(body.name);
  const orderNumber = text(body.orderNumber).toUpperCase();
  const purchasedOn = text(body.purchasedOn);

  if (!name) return json({ error: "Name the machine you bought." }, 400);
  if (!orderNumber) return json({ error: "Add your order number." }, 400);

  const id = crypto.randomUUID();
  const labelNumber = `PCM-LBL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const trackingNumber = `PCMT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  await env.DB.prepare(
    `INSERT INTO user_products (id, user_id, kind, name, order_number, purchased_on, label_number, tracking_number, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  )
    .bind(
      id,
      user.id,
      kind,
      name,
      orderNumber,
      purchasedOn,
      labelNumber,
      trackingNumber,
      new Date().toISOString()
    )
    .run();

  return json(
    {
      product: {
        id,
        kind,
        name,
        orderNumber,
        purchasedOn,
        labelNumber,
        trackingNumber,
        createdAt: new Date().toISOString(),
      },
    },
    201
  );
}

export async function handleDeleteProduct(request: Request, env: Env, id: string) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  await env.DB.prepare(
    "DELETE FROM user_products WHERE id = ?1 AND user_id = ?2"
  )
    .bind(id, user.id)
    .run();

  return json({ ok: true });
}

export async function attachOrderToUser(
  env: Env,
  request: Request,
  order: {
    id: string;
    reference: string;
    lines: { name: string; quantity: number }[];
    total: number;
    currency: string;
    status: string;
    method: string;
  }
) {
  const token = readToken(request);

  if (!token) return;

  const user = await findUserByToken(env, token);

  if (!user) return;

  await env.DB.prepare(
    `INSERT OR REPLACE INTO user_orders (id, user_id, reference, title, detail, total, currency, status, method, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  )
    .bind(
      order.id,
      user.id,
      order.reference,
      order.lines.map((line) => line.name).join(", "),
      order.lines.map((line) => `${line.name} x${line.quantity}`).join(" · "),
      order.total,
      order.currency,
      order.status,
      order.method,
      new Date().toISOString()
    )
    .run();
}
