import {
  createSession,
  ensureInitialized,
  ensureSettings,
  findUserByToken,
  readToken,
  toUser,
  type StoredUser,
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

  const { auth: firebaseAuth, firestore: db } = await ensureInitialized(env);

  const existing = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) {
    return json({ error: "An account already uses that email." }, 409);
  }

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

  await db.collection("users").doc(userId).set({
    id: userId,
    email,
    name,
    phone,
    country,
    postal_code: postalCode,
    tier: "Member",
    bachs_customer_id: bachsCustomerId,
    email_verified: 0,
    created_at: createdAt,
  });

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

  const { auth: firebaseAuth, firestore: db } = await ensureInitialized(env);

  let userRecord;

  try {
    userRecord = await firebaseAuth.getUserByEmail(email);
  } catch {
    return json({ error: "Those details do not match an account." }, 401);
  }

  const userDoc = await db.collection("users").doc(userRecord.uid).get();

  if (!userDoc.exists) {
    return json({ error: "Account not found in our system." }, 404);
  }

  const userData = userDoc.data() as {
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
  };

  const storedUser: StoredUser = {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    phone: userData.phone ?? "",
    country: userData.country ?? "",
    postalCode: userData.postal_code ?? "",
    tier: userData.tier ?? "Member",
    memberSince: userData.created_at
      ? userData.created_at.slice(0, 4)
      : "2024",
    bachsCustomerId: userData.bachs_customer_id ?? null,
    emailVerified: userData.email_verified === 1,
    createdAt: userData.created_at,
  };

  const session = await createSession(env, userRecord.uid);

  return json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: toUser(storedUser),
  });
}

export async function handleLogout(request: Request, env: Env) {
  const token = readToken(request);

  if (token) {
    const { firestore: db } = await ensureInitialized(env);
    await db.collection("user_sessions").doc(token).delete();
  }

  return json({ ok: true });
}

export async function handleMe(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  const { firestore: db } = await ensureInitialized(env);
  const settings = await ensureSettings(env, user.id);

  const ordersSnap = await db
    .collection("user_orders")
    .where("user_id", "==", user.id)
    .get();

  const productsSnap = await db
    .collection("user_products")
    .where("user_id", "==", user.id)
    .get();

  return json({
    user,
    settings,
    counts: {
      orders: ordersSnap.size,
      products: productsSnap.size,
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

  const { firestore: db } = await ensureInitialized(env);

  await db.collection("users").doc(user.id).update({
    name,
    email,
    phone,
    country,
    postal_code: postalCode,
  });

  const doc = await db.collection("users").doc(user.id).get();

  if (!doc.exists) {
    return json({ error: "User not found." }, 404);
  }

  const data = doc.data() as {
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
  };

  return json({
    user: toUser({
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone ?? "",
      country: data.country ?? "",
      postalCode: data.postal_code ?? "",
      tier: data.tier ?? "Member",
      memberSince: data.created_at ? data.created_at.slice(0, 4) : "2024",
      bachsCustomerId: data.bachs_customer_id ?? null,
      emailVerified: data.email_verified === 1,
      createdAt: data.created_at,
    }),
  });
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

  const { firestore: db } = await ensureInitialized(env);

  await db.collection("user_settings").doc(user.id).set(
    {
      order_updates: settings.orderUpdates ? 1 : 0,
      drop_notifications: settings.dropNotifications ? 1 : 0,
      marketing_emails: settings.marketingEmails ? 1 : 0,
      language: settings.language,
      currency: settings.currency,
    },
    { merge: true }
  );

  return json({ settings });
}

export async function handleUserOrders(request: Request, env: Env) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  const { firestore: db } = await ensureInitialized(env);

  const ordersSnap = await db
    .collection("user_orders")
    .where("user_id", "==", user.id)
    .orderBy("created_at", "desc")
    .limit(50)
    .get();

  const orders = ordersSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      reference: data.reference,
      title: data.title,
      detail: data.detail ?? "",
      total: data.total,
      currency: data.currency,
      status: data.status,
      method: data.method ?? "",
      createdAt: data.created_at,
    };
  });

  return json({ orders });
}

export async function handleProducts(request: Request, env: Env, id?: string) {
  const user = await requireUser(request, env);

  if (!user) return json({ error: "Not signed in." }, 401);

  const { firestore: db } = await ensureInitialized(env);

  if (id) {
    const doc = await db.collection("user_products").doc(id).get();

    if (!doc.exists) return json({ error: "Product not found." }, 404);

    const data = doc.data();
    return json({
      product: {
        id: doc.id,
        kind: data?.kind,
        name: data?.name,
        orderNumber: data?.order_number,
        purchasedOn: data?.purchased_on ?? "",
        labelNumber: data?.label_number,
        trackingNumber: data?.tracking_number,
        createdAt: data?.created_at,
      },
    });
  }

  const productsSnap = await db
    .collection("user_products")
    .where("user_id", "==", user.id)
    .orderBy("created_at", "desc")
    .limit(50)
    .get();

  const products = productsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      kind: data?.kind,
      name: data?.name,
      orderNumber: data?.order_number,
      purchasedOn: data?.purchased_on ?? "",
      labelNumber: data?.label_number,
      trackingNumber: data?.tracking_number,
      createdAt: data?.created_at,
    };
  });

  if (request.method === "GET") {
    return json({ products });
  }

  const body = await readJson(request);

  if (!body) return json({ error: "Invalid request." }, 400);

  const kind = text(body.kind) === "laptop" ? "laptop" : "pc";
  const name = text(body.name);
  const orderNumber = text(body.orderNumber).toUpperCase();
  const purchasedOn = text(body.purchasedOn);

  if (!name) return json({ error: "Name the machine you bought." }, 400);
  if (!orderNumber) return json({ error: "Add your order number." }, 400);

  const productId = crypto.randomUUID();
  const labelNumber = `PCM-LBL-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const trackingNumber = `PCMT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  await db.collection("user_products").doc(productId).set({
    id: productId,
    user_id: user.id,
    kind,
    name,
    order_number: orderNumber,
    purchased_on: purchasedOn,
    label_number: labelNumber,
    tracking_number: trackingNumber,
    created_at: new Date().toISOString(),
  });

  return json(
    {
      product: {
        id: productId,
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

  const { firestore: db } = await ensureInitialized(env);
  await db.collection("user_products").doc(id).delete();

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

  const { firestore: db } = await ensureInitialized(env);

  await db.collection("user_orders").doc(order.id).set({
    id: order.id,
    user_id: user.id,
    reference: order.reference,
    title: order.lines.map((line) => line.name).join(", "),
    detail: order.lines
      .map((line) => `${line.name} x${line.quantity}`)
      .join(" · "),
    total: order.total,
    currency: order.currency,
    status: order.status,
    method: order.method,
    created_at: new Date().toISOString(),
  });
}
