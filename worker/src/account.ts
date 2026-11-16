import {
  createSession,
  ensureInitialized,
  ensureSettings,
  findUserByToken,
  readToken,
  rowToStoredUser,
  toUser,
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

  const { auth: firebaseAuth } = await ensureInitialized(env);

  let userId: string;

  try {
    const userRecord = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
    });

    userId = userRecord.uid;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";

    if (code === "auth/email-already-exists") {
      return json({ error: "An account already uses that email." }, 409);
    }

    if (code === "auth/invalid-email") {
      return json({ error: "Enter a valid email address." }, 400);
    }

    if (code === "auth/weak-password") {
      return json({ error: "Use at least 8 characters." }, 400);
    }

    console.error("createUser failed:", code);
    return json({ error: "We could not create that account." }, 500);
  }

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

  const createdAt = new Date().toISOString();

  // Any stale row for this email belongs to a pre-Firebase account.
  await env.DB.prepare("DELETE FROM users WHERE email = ?1").bind(email).run();

  await env.DB.prepare(
    `INSERT INTO users
       (id, email, name, phone, country, postal_code, tier, bachs_customer_id, email_verified, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'Member', ?7, 0, ?8)`
  )
    .bind(userId, email, name, phone, country, postalCode, bachsCustomerId, createdAt)
    .run();

  await ensureSettings(env, userId);

  await firebaseAuth.setCustomUserClaims(userId, {
    tier: "Member",
    memberSince: new Date().getFullYear().toString(),
  });

  const session = await createSession(env, userId);

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
        memberSince: new Date().getFullYear().toString(),
        bachsCustomerId,
        emailVerified: false,
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

  const { auth: firebaseAuth } = await ensureInitialized(env);

  let userRecord;

  try {
    userRecord = await firebaseAuth.getUserByEmail(email);
  } catch {
    return json({ error: "Those details do not match an account." }, 401);
  }

  const row = await env.DB.prepare(
    `SELECT id, email, name, phone, country, postal_code, tier, bachs_customer_id, email_verified, created_at
       FROM users WHERE id = ?1`
  )
    .bind(userRecord.uid)
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

  if (!row) {
    return json({ error: "Account not found in our system." }, 404);
  }

  const session = await createSession(env, row.id);

  return json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: toUser(rowToStoredUser(row)),
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

  const orders = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM user_orders WHERE user_id = ?1"
  )
    .bind(user.id)
    .first<{ count: number }>();

  const products = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM user_products WHERE user_id = ?1"
  )
    .bind(user.id)
    .first<{ count: number }>();

  return json({
    user,
    settings,
    counts: {
      orders: orders?.count ?? 0,
      products: products?.count ?? 0,
    },
  });
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
    `UPDATE users SET name = ?1, email = ?2, phone = ?3, country = ?4, postal_code = ?5
      WHERE id = ?6`
  )
    .bind(name, email, phone, country, postalCode, user.id)
    .run();

  const row = await env.DB.prepare(
    `SELECT id, email, name, phone, country, postal_code, tier, bachs_customer_id, email_verified, created_at
       FROM users WHERE id = ?1`
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

  if (!row) {
    return json({ error: "User not found." }, 404);
  }

  return json({ user: toUser(rowToStoredUser(row)) });
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
    `INSERT INTO user_settings
       (user_id, order_updates, drop_notifications, marketing_emails, language, currency)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(user_id) DO UPDATE SET
       order_updates = excluded.order_updates,
       drop_notifications = excluded.drop_notifications,
       marketing_emails = excluded.marketing_emails,
       language = excluded.language,
       currency = excluded.currency`
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
    `SELECT id, reference, title, detail, total, currency, status, method, created_at
       FROM user_orders WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50`
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
      `SELECT id, kind, name, order_number, purchased_on, label_number, tracking_number, created_at
         FROM user_products WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50`
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
    `INSERT INTO user_products
       (id, user_id, kind, name, order_number, purchased_on, label_number, tracking_number, created_at)
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

  await env.DB.prepare("DELETE FROM user_products WHERE id = ?1 AND user_id = ?2")
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
    `INSERT OR REPLACE INTO user_orders
       (id, user_id, reference, title, detail, total, currency, status, method, created_at)
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
