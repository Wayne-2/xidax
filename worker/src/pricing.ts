import type { Env } from "./types";
import type { CheckoutLine } from "./types";

export const FREE_SHIPPING_THRESHOLD = 99;
export const FLAT_SHIPPING_RATE = 19;

export type PricedLine = CheckoutLine & {
  /** Authoritative unit price from the catalog. */
  unitPrice: number;
  /** True when the client-submitted price differed from the catalog. */
  priceAdjusted: boolean;
};

export type RecomputedTotals = {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  adjusted: boolean;
};

function parseLineId(id: string): { kind: string; productId: string } | null {
  const match = id.match(/^(prebuild|laptop|console)-(.+)$/);

  if (!match) return null;

  return { kind: match[1], productId: match[2] };
}

/**
 * Hardcoded storefront products on the landing page are not in D1 yet. Their
 * prices are public in the page source, so they are safe to whitelist here.
 * Remove this map once those builds are migrated into the products table.
 */
const LEGACY_FEATURED_PRICES: Record<string, number> = {
  "x-6-geforce-rtx-5070": 1649.99,
  "geforce-legendary-amd": 1999.99,
};

/** Looks up the authoritative unit price of a catalog item in D1. */
async function lookupPrice(
  env: Env,
  kind: string,
  productId: string
): Promise<number | null> {
  if (kind === "prebuild") {
    const row = await env.DB.prepare(
      "SELECT price FROM products WHERE id = ?1 AND published = 1"
    )
      .bind(productId)
      .first<{ price: number }>();

    if (row) return Number(row.price);

    return LEGACY_FEATURED_PRICES[productId] ?? null;
  }

  const table = kind === "laptop" ? "laptops" : "consoles";
  const row = await env.DB.prepare(
    `SELECT data, published FROM ${table} WHERE id = ?1`
  )
    .bind(productId)
    .first<{ data: string; published: number }>();

  if (!row || row.published !== 1) return null;

  try {
    const data = JSON.parse(row.data) as { price?: number };
    return typeof data.price === "number" ? data.price : null;
  } catch {
    return null;
  }
}

/**
 * Recomputes all checkout amounts from authoritative D1 catalog prices.
 * Client-submitted prices and totals are never trusted.
 */
export async function recomputeCheckoutTotals(
  env: Env,
  lines: CheckoutLine[]
): Promise<RecomputedTotals | { error: string }> {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Your cart is empty." };
  }

  const priced: PricedLine[] = [];
  let adjusted = false;

  for (const line of lines) {
    const parsed = parseLineId(line.id);

    if (!parsed) {
      return { error: "One of the items in your cart is invalid." };
    }

    const quantity = Math.floor(Number(line.quantity));

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return { error: "Invalid item quantity." };
    }

    const unitPrice = await lookupPrice(env, parsed.kind, parsed.productId);

    if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { error: "One of the items in your cart is no longer available." };
    }

    const priceAdjusted = Math.abs(unitPrice - Number(line.price)) > 0.001;

    if (priceAdjusted) adjusted = true;

    priced.push({
      ...line,
      name: String(line.name ?? "").slice(0, 200),
      kind: parsed.kind,
      quantity,
      unitPrice,
      priceAdjusted,
      price: unitPrice,
    });
  }

  const subtotal = Math.round(
    priced.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) * 100
  ) / 100;

  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  const total = Math.round((subtotal + shipping) * 100) / 100;

  return { lines: priced, subtotal, shipping, total, adjusted };
}
