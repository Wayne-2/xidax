import { describe, expect, it } from "vitest";
import {
  generateUserPromoCode,
  getUserPromoByCode,
} from "../src/user-promo";

describe("generateUserPromoCode", () => {
  it("generates PCM-prefixed codes with no ambiguous characters", () => {
    for (let i = 0; i < 100; i += 1) {
      const code = generateUserPromoCode();
      expect(code).toMatch(/^PCM-[A-HJ-NP-Z2-9]{3}$/);
      expect(code).not.toMatch(/[IO01]/);
    }
  });
});

describe("getUserPromoByCode", () => {
  const env = {
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            uid: "user-1",
            code: "PCM-ABC123",
            discount: 20,
            active: 1,
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
          }),
        }),
      }),
    },
  } as never;

  it("matches case-insensitively", async () => {
    const promo = await getUserPromoByCode(env, "user-1", " pcm-abc123 ");
    expect(promo?.discount).toBe(20);
  });

  it("rejects wrong codes", async () => {
    expect(await getUserPromoByCode(env, "user-1", "WRONG")).toBeNull();
  });

  it("rejects malformed codes", async () => {
    expect(await getUserPromoByCode(env, "user-1", "!!")).toBeNull();
  });
});
