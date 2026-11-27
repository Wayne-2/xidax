import { markSessionPaid } from "./checkout";
import type { CardSummary, Env, PaymentProof, WireDetails } from "./types";

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
  expiresAt: string | null;
  cardSummary: CardSummary | null;
  walletId: string | null;
  walletLabel: string | null;
  wireDetails: WireDetails | null;
  receiptSentAt: string | null;
  paymentProof: PaymentProof | null;
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
  "awaiting_admin",
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

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

type OrderRow = {
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
  expires_at: string | null;
  card_summary: string | null;
  wallet_id: string | null;
  wire_details: string | null;
  receipt_sent_at: string | null;
  payment_proof: string | null;
};

async function loadLines(
  env: Env,
  orderId: string
): Promise<AdminOrder["lines"]> {
  const lineRows = await env.DB.prepare(
    `SELECT id, product_id, name, kind, price, quantity
       FROM order_lines WHERE order_id = ?1 ORDER BY id ASC`
  )
    .bind(orderId)
    .all<{
      id: string;
      product_id: string;
      name: string;
      kind: string | null;
      price: number;
      quantity: number;
    }>();

  return (lineRows.results ?? []).map((line) => ({
    id: line.id,
    productId: line.product_id,
    name: line.name,
    kind: line.kind,
    price: line.price,
    quantity: line.quantity,
  }));
}

async function walletLabel(env: Env, walletId: string | null): Promise<string | null> {
  if (!walletId) return null;
  const row = await env.DB.prepare(
    "SELECT label FROM crypto_wallets WHERE id = ?1"
  )
    .bind(walletId)
    .first<{ label: string }>();
  return row?.label ?? null;
}

async function mapOrderRow(env: Env, row: OrderRow): Promise<AdminOrder> {
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
    expiresAt: row.expires_at,
    cardSummary: parseJson<CardSummary>(row.card_summary),
    walletId: row.wallet_id,
    walletLabel: await walletLabel(env, row.wallet_id),
    wireDetails: parseJson<WireDetails>(row.wire_details),
    receiptSentAt: row.receipt_sent_at,
    paymentProof: parseJson<PaymentProof>(row.payment_proof),
    lines: await loadLines(env, row.id),
  };
}

const ORDER_COLUMNS = `id, reference, email, name, phone, country, postal_code, method, network,
            subtotal, shipping, total, currency, status, created_at,
            expires_at, card_summary, wallet_id, wire_details, receipt_sent_at, payment_proof`;

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
    `SELECT ${ORDER_COLUMNS}
       FROM orders ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  )
    .bind(...bindings, limit, offset)
    .all<OrderRow>();

  const orders: AdminOrder[] = [];

  for (const row of rows.results ?? []) {
    orders.push(await mapOrderRow(env, row));
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
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?1`
  )
    .bind(id)
    .first<OrderRow>();

  if (!row) return null;

  return mapOrderRow(env, row);
}

/**
 * Updates an order's status. Admin-only.
 * Setting `paid` goes through markSessionPaid so the receipt email fires
 * and checkout_sessions / user_orders stay in sync.
 */
export async function updateAdminOrderStatus(
  env: Env,
  id: string,
  status: string
): Promise<{ ok: boolean; notFound?: boolean }> {
  if (!ORDER_STATUSES.has(status)) {
    return { ok: false };
  }

  if (status === "paid") {
    const result = await markSessionPaid(env, id);

    if (!result.ok) {
      if (result.status === 404) return { ok: false, notFound: true };
      return { ok: false };
    }

    return { ok: true, notFound: false };
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

    if (env.RESEND_API_KEY && ["processing","shipped","delivered","cancelled","refunded","failed"].includes(status)) {
      const row = await env.DB.prepare("SELECT reference, email, name, total, currency FROM orders WHERE id = ?1").bind(id).first<{ reference: string; email: string; name: string; total: number; currency: string }>();
      if (row?.email) {
        const { sendOrderStatusEmail, notifyAdminsPaymentEvent } = await import("./email");
        void sendOrderStatusEmail({ apiKey: env.RESEND_API_KEY, to: row.email, reference: row.reference, customerName: row.name || "Customer", status });
        void notifyAdminsPaymentEvent(env, { kind: "card", event: "requested", reference: row.reference, amount: Number(row.total || 0), currency: row.currency || "USD", customerName: row.name || "Customer", customerEmail: row.email, detail: `Order status changed to ${status}.` });
      }
    }
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
