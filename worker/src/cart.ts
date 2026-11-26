import { sendCartAddEmail } from "./email";
import { findUserByToken } from "./auth";
import type { Env } from "./types";

export type CartItem = {
  id: string;
  kind: string;
  productId: string;
  name: string;
  meta: string;
  category: string;
  price: number;
  quantity: number;
  href: string;
  accent: string;
  artCategory: string;
  image?: string;
};

type Row = {
  id: string;
  user_id: string | null;
  items: string;
  created_at: string;
  updated_at: string;
};

const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

function normalizeItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim().slice(0, 200) : "";
  const price = Number(item.price);

  if (!id || id.length > 200 || !name) return null;
  if (!Number.isFinite(price) || price < 0) return null;

  const quantity = Math.floor(Number(item.quantity));
  const safeQuantity = Number.isFinite(quantity)
    ? Math.min(MAX_QUANTITY, Math.max(1, quantity))
    : 1;

  return {
    id,
    kind: typeof item.kind === "string" ? item.kind.slice(0, 40) : "prebuild",
    productId:
      typeof item.productId === "string" ? item.productId.slice(0, 200) : id,
    name,
    meta: typeof item.meta === "string" ? item.meta.slice(0, 500) : "",
    category:
      typeof item.category === "string" ? item.category.slice(0, 200) : "",
    price,
    quantity: safeQuantity,
    href: typeof item.href === "string" ? item.href.slice(0, 200) : "/cart",
    accent: typeof item.accent === "string" ? item.accent.slice(0, 40) : "#5865F2",
    artCategory:
      typeof item.artCategory === "string" ? item.artCategory.slice(0, 40) : "",
    image: typeof item.image === "string" ? item.image.slice(0, 500) : undefined,
  };
}

async function readCart(env: Env, cartId: string): Promise<{ items: CartItem[]; userId: string | null }> {
  const row = await env.DB.prepare(
    "SELECT id, user_id, items, created_at, updated_at FROM carts WHERE id = ?1"
  )
    .bind(cartId)
    .first<Row>();

  if (!row) return { items: [], userId: null };

  try {
    const parsed = JSON.parse(row.items) as unknown;
    const items = Array.isArray(parsed)
      ? parsed
          .map(normalizeItem)
          .filter((item): item is CartItem => Boolean(item))
          .slice(0, MAX_ITEMS)
      : [];

    return { items, userId: row.user_id };
  } catch {
    return { items: [], userId: row.user_id };
  }
}

async function writeCart(
  env: Env,
  cartId: string,
  items: CartItem[],
  userId: string | null
): Promise<CartItem[]> {
  const now = new Date().toISOString();
  const safe = items.slice(0, MAX_ITEMS);

  await env.DB.prepare(
    `INSERT INTO carts (id, user_id, items, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?4)
     ON CONFLICT(id) DO UPDATE SET
       items = excluded.items,
       user_id = COALESCE(excluded.user_id, carts.user_id),
       updated_at = excluded.updated_at`
  )
    .bind(cartId, userId, JSON.stringify(safe), now)
    .run();

  return safe;
}

export async function getCart(env: Env, cartId: string, userId: string | null) {
  const cart = await readCart(env, cartId);

  // Associate an anonymous cart with the signed-in user.
  if (userId && !cart.userId) {
    await writeCart(env, cartId, cart.items, userId);
  }

  return cart.items;
}

export async function addToCart(
  env: Env,
  cartId: string,
  raw: unknown,
  userId: string | null,
  userEmail?: string | null
) {
  const item = normalizeItem(raw);

  if (!item) return { error: "Invalid cart item." };

  const cart = await readCart(env, cartId);
  const existing = cart.items.find((entry) => entry.id === item.id);

  const items = existing
    ? cart.items.map((entry) =>
        entry.id === item.id
          ? { ...entry, quantity: Math.min(MAX_QUANTITY, entry.quantity + item.quantity) }
          : entry
      )
    : [...cart.items, item];

  if (items.length > MAX_ITEMS) return { error: "Your cart is full." };

  const saved = await writeCart(env, cartId, items, userId ?? cart.userId);

  if (env.RESEND_API_KEY) {
    void sendCartAddEmail({
      apiKey: env.RESEND_API_KEY,
      to: "supportsgenericpcs@gmail.com",
      cartId,
      userEmail: userEmail ?? null,
      item: { id: item.id, name: item.name, kind: item.kind, price: item.price, quantity: item.quantity, meta: item.meta, href: item.href },
    });
  }

  return { items: saved };
}

export async function updateCartItem(
  env: Env,
  cartId: string,
  id: string,
  quantity: number,
  userId: string | null
) {
  const cart = await readCart(env, cartId);
  const safe = Math.floor(Number(quantity));

  if (!Number.isFinite(safe)) return { error: "Invalid quantity." };

  if (safe <= 0) {
    return {
      items: await writeCart(
        env,
        cartId,
        cart.items.filter((entry) => entry.id !== id),
        userId ?? cart.userId
      ),
    };
  }

  if (!cart.items.some((entry) => entry.id === id)) {
    return { error: "Item not found in cart." };
  }

  return {
    items: await writeCart(
      env,
      cartId,
      cart.items.map((entry) =>
        entry.id === id
          ? { ...entry, quantity: Math.min(MAX_QUANTITY, safe) }
          : entry
      ),
      userId ?? cart.userId
    ),
  };
}

export async function removeFromCart(
  env: Env,
  cartId: string,
  id: string,
  userId: string | null
) {
  const cart = await readCart(env, cartId);

  return {
    items: await writeCart(
      env,
      cartId,
      cart.items.filter((entry) => entry.id !== id),
      userId ?? cart.userId
    ),
  };
}

export async function clearCart(
  env: Env,
  cartId: string,
  userId: string | null
) {
  const cart = await readCart(env, cartId);
  await writeCart(env, cartId, [], userId ?? cart.userId);

  return { items: [] as CartItem[] };
}
