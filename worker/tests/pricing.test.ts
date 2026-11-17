import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_RATE,
  recomputeCheckoutTotals,
} from "../src/pricing";
import type { CheckoutLine } from "../src/types";

function fakeEnv(overrides: Record<string, unknown> = {}) {
  return {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            // Prebuild lookup
            if (sql.includes("FROM products")) {
              const id = String(args[0]);
              if (id === "p1") return { price: 50 };
              if (id === "p2") return { price: 250 };
              return null;
            }
            // Catalog items (laptops/consoles)
            if (sql.includes("FROM laptops") || sql.includes("FROM consoles")) {
              const id = String(args[0]);
              if (id === "l1") return { data: JSON.stringify({ price: 500 }), published: 1 };
              if (id === "c1") return { data: JSON.stringify({ price: 300 }), published: 1 };
              return null;
            }
            return null;
          },
        }),
      }),
    },
    ...overrides,
  } as never;
}

function line(id: string, price: number, quantity = 1): CheckoutLine {
  return { id, name: "Test", kind: "test", price, quantity };
}

describe("recomputeCheckoutTotals", () => {
  it("rejects empty carts", async () => {
    const result = await recomputeCheckoutTotals(fakeEnv(), []);
    expect("error" in result).toBe(true);
  });

  it("rejects invalid line IDs", async () => {
    const result = await recomputeCheckoutTotals(fakeEnv(), [line("bogus", 10)]);
    expect("error" in result).toBe(true);
  });

  it("rejects unavailable products", async () => {
    const result = await recomputeCheckoutTotals(fakeEnv(), [line("prebuild-missing", 10)]);
    expect("error" in result).toBe(true);
  });

  it("uses catalog price instead of client price", async () => {
    const result = await recomputeCheckoutTotals(fakeEnv(), [line("prebuild-p1", 1)]);
    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.lines[0].price).toBe(50);
    expect(result.lines[0].priceAdjusted).toBe(true);
    expect(result.subtotal).toBe(50);
    expect(result.adjusted).toBe(true);
  });

  it("computes shipping correctly below and above threshold", async () => {
    const below = await recomputeCheckoutTotals(fakeEnv(), [line("prebuild-p1", 50)]);
    expect("error" in below).toBe(false);
    if ("error" in below) return;
    expect(below.shipping).toBe(FLAT_SHIPPING_RATE);
    expect(below.total).toBe(50 + FLAT_SHIPPING_RATE);

    const above = await recomputeCheckoutTotals(fakeEnv(), [line("prebuild-p2", 250)]);
    expect("error" in above).toBe(false);
    if ("error" in above) return;
    expect(above.shipping).toBe(0);
    expect(above.total).toBe(250);
  });

  it("handles laptops and consoles from JSON catalog", async () => {
    const result = await recomputeCheckoutTotals(fakeEnv(), [
      line("laptop-l1", 1),
      line("console-c1", 1),
    ]);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.lines[0].price).toBe(500);
    expect(result.lines[1].price).toBe(300);
  });

  it("supports legacy featured prices", async () => {
    const result = await recomputeCheckoutTotals(fakeEnv(), [line("prebuild-x-6-geforce-rtx-5070", 1)]);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.lines[0].price).toBe(1649.99);
  });
});
