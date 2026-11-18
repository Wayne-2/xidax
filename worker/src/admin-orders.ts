import type { Env } from "./types";

export type AdminOrder = {
  id: string;
  reference: string;
  email: string;
  name: string;
  phone: string | null;
  country: string | null;
  method: string;
  network: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  lines: {
    id: string;
    productId: string;
    name: string;
    kind: string | null;
    price: number;
    quantity: number;
  }[];
};

const ORDER_STATUSES = new Set([
  "pending",
  "awaiting_payment",
  "submitted",
  "paid",
  "expired",
  "failed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(parsed, max);
}

/** Lists orders with optional filters. Admin-only. */
export async function listAdminOrders(
  env: Env,
  url: URL
): Promise<{ orders: AdminOrder[]; total: number; limit: number; offset: number }> {
  const limit = parsePositiveInt(url.searchParams.get("limit"), 25);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const status = url.searchParams.get("status")?.trim() ?? "";
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (status && ORDER_STATUSES.has(status)) {
    conditions.push("status = ?");
    bindings.push(status);
  }

  if (search) {
    conditions.push("(LOWER(email) LIKE ? OR LOWER(name) LIKE ? OR LOWER(reference) LIKE ?)");
    const pattern = `%${search}%`;
    bindings.push(pattern, pattern, pattern);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM orders ${where}`
  )
    .bind(...bindings)
    .first<{ count: number }>();

  const rows = await env.DB.prepare(
    `SELECT id, reference, email, name, phone, country, postal_code, method, network,
            subtotal, shipping, total, currency, status, created_at
       FROM orders ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  )
    .bind(...bindings, limit, offset)
    .all<{
      id: string;
      reference: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      method: string;
      network: string | null;
      subtotal: number;
      shipping: number;
      total: number;
      currency: string;
      status: string;
      created_at: string;
    }>();

  const orders: AdminOrder[] = [];

  for (const row of rows.results ?? []) {
    const lineRows = await env.DB.prepare(
      `SELECT id, product_id, name, kind, price, quantity
         FROM order_lines WHERE order_id = ?1 ORDER BY id ASC`
    )
      .bind(row.id)
      .all<{
        id: string;
        product_id: string;
        name: string;
        kind: string | null;
        price: number;
        quantity: number;
      }>();

    orders.push({
      id: row.id,
      reference: row.reference,
      email: row.email,
      name: row.name,
      phone: row.phone,
      country: row.country ?? null,
      method: row.method,
      network: row.network,
      subtotal: row.subtotal,
      shipping: row.shipping,
      total: row.total,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      lines: (lineRows.results ?? []).map((line) => ({
        id: line.id,
        productId: line.product_id,
        name: line.name,
        kind: line.kind,
        price: line.price,
        quantity: line.quantity,
      })),
    });
  }

  return {
    orders,
    total: countRow?.count ?? 0,
    limit,
    offset,
  };
}

/** Gets a single order with its lines. Admin-only. */
export async function getAdminOrder(
  env: Env,
  id: string
): Promise<AdminOrder | null> {
  const row = await env.DB.prepare(
    `SELECT id, reference, email, name, phone, country, postal_code, method, network,
            subtotal, shipping, total, currency, status, created_at
       FROM orders WHERE id = ?1`
  )
    .bind(id)
    .first<{
      id: string;
      reference: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      method: string;
      network: string | null;
      subtotal: number;
      shipping: number;
      total: number;
      currency: string;
      status: string;
      created_at: string;
    }>();

  if (!row) return null;

  const lineRows = await env.DB.prepare(
    `SELECT id, product_id, name, kind, price, quantity
       FROM order_lines WHERE order_id = ?1 ORDER BY id ASC`
  )
    .bind(row.id)
    .all<{
      id: string;
      product_id: string;
      name: string;
      kind: string | null;
      price: number;
      quantity: number;
    }>();

  return {
    id: row.id,
    reference: row.reference,
    email: row.email,
    name: row.name,
    phone: row.phone,
    country: row.country ?? null,
    method: row.method,
    network: row.network,
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    lines: (lineRows.results ?? []).map((line) => ({
      id: line.id,
      productId: line.product_id,
      name: line.name,
      kind: line.kind,
      price: line.price,
      quantity: line.quantity,
    })),
  };
}

/** Updates an order's status. Admin-only. */
export async function updateAdminOrderStatus(
  env: Env,
  id: string,
  status: string
): Promise<{ ok: boolean; notFound?: boolean }> {
  if (!ORDER_STATUSES.has(status)) {
    return { ok: false };
  }

  const result = await env.DB.prepare(
    "UPDATE orders SET status = ?1 WHERE id = ?2"
  )
    .bind(status, id)
    .run();

  const changed = (result.meta?.changes ?? 0) > 0;

  if (changed) {
    // Keep the user-facing order history in sync.
    await env.DB.prepare(
      "UPDATE user_orders SET status = ?1 WHERE id = ?2"
    )
      .bind(status, id)
      .run();

    // Keep the cached checkout session in sync so GET /api/checkout/:id
    // reflects admin changes. json_set works on the JSON data column.
    await env.DB.prepare(
      `UPDATE checkout_sessions
          SET status = ?1,
              data = json_set(data, '$.status', ?1)
        WHERE id = ?2`
    )
      .bind(status, id)
      .run();
  }

  return { ok: true, notFound: !changed };
}

/** Returns aggregate stats for the orders overview. Admin-only. */
export async function getAdminOrderStats(env: Env) {
  const [totals, byStatus, recent] = await Promise.all([
    env.DB.prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') THEN total ELSE 0 END), 0) AS revenue,
         COALESCE(SUM(total), 0) AS orderValue
         FROM orders`
    ).first<{ count: number; revenue: number; orderValue: number }>(),
    env.DB.prepare(
      `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
    ).all<{ status: string; count: number }>(),
    env.DB.prepare(
      `SELECT created_at, total FROM orders ORDER BY created_at DESC LIMIT 100`
    ).all<{ created_at: string; total: number }>(),
  ]);

  return {
    totalOrders: totals?.count ?? 0,
    revenue: totals?.revenue ?? 0,
    orderValue: totals?.orderValue ?? 0,
    byStatus: byStatus.results ?? [],
    recent: recent.results ?? [],
  };
}
