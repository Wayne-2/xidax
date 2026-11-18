import type { Env } from "./types";

export type Promo = {
  code: string;
  discount: number;
  productId: string;
  kind: "prebuild" | "laptop" | "console";
};

const CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;

/**
 * Looks up an active promo code for a product that is in the cart.
 *
 * The code is resolved server-side from D1 only. A client cannot invent a
 * discount: the rate always comes from the stored product record.
 */
export async function lookupPromo(
  env: Env,
  rawCode: string,
  lineIds: string[]
): Promise<Promo | null> {
  const code = rawCode.trim().toUpperCase();

  if (!CODE_PATTERN.test(code)) return null;

  // Structured products table (prebuilds).
  const productRows = await env.DB.prepare(
    `SELECT id, promo_discount FROM products
      WHERE promo_code = ?1 AND promo_enabled = 1 AND published = 1`
  )
    .bind(code)
    .all<{ id: string; promo_discount: number }>();

  for (const row of productRows.results ?? []) {
    if (
      lineIds.includes(`prebuild-${row.id}`) &&
      Number(row.promo_discount) > 0
    ) {
      return {
        code,
        discount: Math.min(100, Math.max(0, Number(row.promo_discount))),
        productId: row.id,
        kind: "prebuild",
      };
    }
  }

  // JSON catalog tables (laptops / consoles).
  for (const kind of ["laptop", "console"] as const) {
    const table = kind === "laptop" ? "laptops" : "consoles";

    const rows = await env.DB.prepare(
      `SELECT id, data, published FROM ${table} WHERE published = 1`
    ).all<{ id: string; data: string; published: number }>();

    for (const row of rows.results ?? []) {
      if (!lineIds.includes(`${kind}-${row.id}`)) continue;

      try {
        const data = JSON.parse(row.data) as {
          promoCode?: string;
          promoDiscount?: number;
          promoEnabled?: boolean;
        };

        if (
          String(data.promoCode ?? "").toUpperCase() === code &&
          data.promoEnabled === true &&
          Number(data.promoDiscount) > 0
        ) {
          return {
            code,
            discount: Math.min(100, Math.max(0, Number(data.promoDiscount))),
            productId: row.id,
            kind,
          };
        }
      } catch {
        // Skip malformed records.
      }
    }
  }

  return null;
}

/** Rounds a monetary value to cents. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
