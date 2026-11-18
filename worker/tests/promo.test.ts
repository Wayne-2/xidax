import { describe, expect, it } from "vitest";
import { lookupPromo, roundMoney } from "../src/promo";

function fakeEnv(products: { id: string; promo_discount: number }[] = []) {
  return {
    DB: {
      prepare: (sql: string) => ({
        bind: () => ({
          all: async () => {
            if (sql.includes("FROM products")) return { results: products };
            return { results: [] };
          },
        }),
        all: async () => ({ results: [] }),
      }),
    },
  } as never;
}

describe("roundMoney", () => {
  it("rounds to cents", () => {
    expect(roundMoney(1.016)).toBe(1.02);
    expect(roundMoney(2.346)).toBe(2.35);
    expect(roundMoney(10)).toBe(10);
  });
});

describe("lookupPromo", () => {
  it("rejects invalid codes", async () => {
    expect(await lookupPromo(fakeEnv(), "!!", ["prebuild-p1"])).toBeNull();
    expect(await lookupPromo(fakeEnv(), "AB", ["prebuild-p1"])).toBeNull();
  });

  it("finds a product promo in the cart", async () => {
    const result = await lookupPromo(
      fakeEnv([{ id: "p1", promo_discount: 15 }]),
      "pcm-abc123",
      ["prebuild-p1"]
    );

    expect(result).not.toBeNull();
    expect(result?.code).toBe("PCM-ABC123");
    expect(result?.discount).toBe(15);
    expect(result?.kind).toBe("prebuild");
  });

  it("ignores promos for products not in the cart", async () => {
    const result = await lookupPromo(
      fakeEnv([{ id: "p1", promo_discount: 15 }]),
      "PCM-ABC123",
      ["prebuild-other"]
    );

    expect(result).toBeNull();
  });

  it("ignores zero-discount promos", async () => {
    const result = await lookupPromo(
      fakeEnv([{ id: "p1", promo_discount: 0 }]),
      "PCM-ABC123",
      ["prebuild-p1"]
    );

    expect(result).toBeNull();
  });
});
