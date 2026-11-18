import { describe, expect, it } from "vitest";
import { addToCart, getCart, removeFromCart, updateCartItem } from "../src/cart";

function makeEnv() {
  const store = new Map<string, string>();
  const DB = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          const id = String(args[0]);
          const raw = store.get(id);
          return raw
            ? { id, user_id: null, items: raw, created_at: "", updated_at: "" }
            : null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO carts")) {
            store.set(String(args[0]), String(args[2]));
          }
          return { meta: { changes: 1 } };
        },
      }),
    }),
  };

  return { env: { DB } as never, store };
}

const item = (id: string, quantity = 1) => ({
  id,
  kind: "prebuild",
  productId: id,
  name: `Product ${id}`,
  meta: "test",
  category: "Prebuilt",
  price: 100,
  quantity,
  href: "/prebuilds",
  accent: "#5865F2",
  artCategory: "intel",
});

describe("server cart", () => {
  it("starts empty", async () => {
    const { env } = makeEnv();
    expect(await getCart(env, "cart-1", null)).toEqual([]);
  });

  it("adds an item", async () => {
    const { env } = makeEnv();
    const result = await addToCart(env, "cart-1", item("prebuild-a"), null);
    expect("items" in result).toBe(true);
    if ("items" in result) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("prebuild-a");
    }
  });

  it("increments quantity on repeat add", async () => {
    const { env } = makeEnv();
    await addToCart(env, "cart-1", item("prebuild-a"), null);
    const result = await addToCart(env, "cart-1", item("prebuild-a"), null);
    if ("items" in result) expect(result.items[0].quantity).toBe(2);
  });

  it("updates quantity and removes at zero", async () => {
    const { env } = makeEnv();
    await addToCart(env, "cart-1", item("prebuild-a"), null);

    let result = await updateCartItem(env, "cart-1", "prebuild-a", 5, null);
    if ("items" in result) expect(result.items[0].quantity).toBe(5);

    result = await updateCartItem(env, "cart-1", "prebuild-a", 0, null);
    if ("items" in result) expect(result.items).toHaveLength(0);
  });

  it("removes an item", async () => {
    const { env } = makeEnv();
    await addToCart(env, "cart-1", item("prebuild-a"), null);
    await addToCart(env, "cart-1", item("prebuild-b"), null);

    const result = await removeFromCart(env, "cart-1", "prebuild-a", null);
    if ("items" in result) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("prebuild-b");
    }
  });

  it("rejects invalid items", async () => {
    const { env } = makeEnv();
    const result = await addToCart(env, "cart-1", { id: "" }, null);
    expect("error" in result).toBe(true);
  });
});
