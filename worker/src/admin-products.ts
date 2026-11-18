import type { Env } from "./types";

export type Product = {
  id: string;
  name: string;
  image: string;
  images: string[];
  brand: "intel" | "amd";
  price: number;
  originalPrice: number;
  stock: "in-stock" | "built-to-order";
  flagship: boolean;
  specs: string;
  featured: boolean;
  featuredOrder: number;
  promoCode: string | null;
  promoDiscount: number;
  promoEnabled: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

const VALID_BRANDS = new Set(["intel", "amd"]);
const VALID_STOCKS = new Set(["in-stock", "built-to-order"]);

type Row = {
  id: string;
  name: string;
  image: string;
  images: string | null;
  brand: string;
  price: number;
  original_price: number;
  stock: string;
  flagship: number;
  specs: string;
  featured: number;
  featured_order: number;
  promo_code: string | null;
  promo_discount: number;
  promo_enabled: number;
  published: number;
  created_at: string;
  updated_at: string;
};

function parseImages(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function rowToProduct(row: Row): Product {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    images: parseImages(row.images),
    brand: row.brand as Product["brand"],
    price: row.price,
    originalPrice: row.original_price,
    stock: row.stock as Product["stock"],
    flagship: row.flagship === 1,
    specs: row.specs,
    featured: row.featured === 1,
    featuredOrder: row.featured_order,
    promoCode: row.promo_code ?? null,
    promoDiscount: Number(row.promo_discount ?? 0),
    promoEnabled: row.promo_enabled === 1,
    published: row.published === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Public: published products only, in creation order. */
export async function listPublishedProducts(env: Env): Promise<Product[]> {
  const rows = await env.DB.prepare(
    `SELECT * FROM products WHERE published = 1 ORDER BY created_at ASC`
  ).all<Row>();

  return (rows.results ?? []).map(rowToProduct);
}

/** Admin: all products including drafts. */
export async function listAllProducts(env: Env): Promise<Product[]> {
  const rows = await env.DB.prepare(
    `SELECT * FROM products ORDER BY created_at ASC`
  ).all<Row>();

  return (rows.results ?? []).map(rowToProduct);
}

export async function getProduct(env: Env, id: string): Promise<Product | null> {
  const row = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ?1"
  )
    .bind(id)
    .first<Row>();

  return row ? rowToProduct(row) : null;
}

export type ProductInput = {
  name: string;
  image: string;
  images: string[];
  brand: string;
  price: number;
  originalPrice: number;
  stock: string;
  flagship: boolean;
  specs: string;
  featured: boolean;
  featuredOrder: number;
  promoCode: string | null;
  promoDiscount: number;
  promoEnabled: boolean;
  published: boolean;
};

/** Generates a short, unique-looking promo code. */
export function generatePromoCode(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let suffix = "";
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];

  return `PCM-${suffix}`;
}

export function validateProductInput(
  body: Record<string, unknown>
): { ok: true; input: ProductInput } | { ok: false; error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const images = Array.isArray(body.images)
    ? body.images.filter((item): item is string => typeof item === "string").slice(0, 3)
    : [];
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  const stock = typeof body.stock === "string" ? body.stock.trim() : "";
  const specs = typeof body.specs === "string" ? body.specs.trim() : "";
  const price = Number(body.price);
  const originalPrice = Number(body.originalPrice);
  const featuredOrder = Number(body.featuredOrder ?? 0);
  const promoCodeRaw = typeof body.promoCode === "string" ? body.promoCode.trim().toUpperCase() : "";
  const promoCode = promoCodeRaw ? promoCodeRaw.slice(0, 32) : null;
  const promoDiscount = Number(body.promoDiscount ?? 0);

  if (!name) return { ok: false, error: "Name is required." };
  if (!image) return { ok: false, error: "Image is required." };
  if (!VALID_BRANDS.has(brand)) return { ok: false, error: "Brand must be intel or amd." };
  if (!VALID_STOCKS.has(stock)) return { ok: false, error: "Invalid stock value." };
  if (!specs) return { ok: false, error: "Specs are required." };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Price must be greater than zero." };
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return { ok: false, error: "Original price must be greater than zero." };
  }

  if (
    (promoCode || body.promoEnabled === true) &&
    (!Number.isFinite(promoDiscount) || promoDiscount < 1 || promoDiscount > 100)
  ) {
    return { ok: false, error: "Promo discount must be between 1 and 100 percent." };
  }

  return {
    ok: true,
    input: {
      name,
      image,
      images,
      brand,
      price,
      originalPrice,
      stock,
      flagship: body.flagship === true,
      specs,
      featured: body.featured === true,
      featuredOrder: Number.isFinite(featuredOrder) ? featuredOrder : 0,
      promoCode,
      promoDiscount: Number.isFinite(promoDiscount) ? promoDiscount : 0,
      promoEnabled: body.promoEnabled === true && Boolean(promoCode),
      published: body.published !== false,
    },
  };
}

export async function createProduct(
  env: Env,
  id: string,
  input: ProductInput
): Promise<Product> {
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO products
       (id, name, image, images, brand, price, original_price, stock, flagship, specs,
        featured, featured_order, promo_code, promo_discount, promo_enabled,
        published, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?17)`
  )
    .bind(
      id,
      input.name,
      input.image,
      JSON.stringify(input.images),
      input.brand,
      input.price,
      input.originalPrice,
      input.stock,
      input.flagship ? 1 : 0,
      input.specs,
      input.featured ? 1 : 0,
      input.featuredOrder,
      input.promoCode,
      input.promoDiscount,
      input.promoEnabled ? 1 : 0,
      input.published ? 1 : 0,
      now
    )
    .run();

  return (await getProduct(env, id))!;
}

export async function updateProduct(
  env: Env,
  id: string,
  input: ProductInput
): Promise<Product | null> {
  const existing = await getProduct(env, id);

  if (!existing) return null;

  await env.DB.prepare(
    `UPDATE products SET
       name = ?1, image = ?2, images = ?3, brand = ?4, price = ?5, original_price = ?6,
       stock = ?7, flagship = ?8, specs = ?9, featured = ?10,
       featured_order = ?11, promo_code = ?12, promo_discount = ?13,
       promo_enabled = ?14, published = ?15, updated_at = ?16
     WHERE id = ?17`
  )
    .bind(
      input.name,
      input.image,
      JSON.stringify(input.images),
      input.brand,
      input.price,
      input.originalPrice,
      input.stock,
      input.flagship ? 1 : 0,
      input.specs,
      input.featured ? 1 : 0,
      input.featuredOrder,
      input.promoCode,
      input.promoDiscount,
      input.promoEnabled ? 1 : 0,
      input.published ? 1 : 0,
      new Date().toISOString(),
      id
    )
    .run();

  return getProduct(env, id);
}

export async function deleteProduct(env: Env, id: string): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM products WHERE id = ?1"
  )
    .bind(id)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function setPublished(
  env: Env,
  id: string,
  published: boolean
): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE products SET published = ?1, updated_at = ?2 WHERE id = ?3"
  )
    .bind(published ? 1 : 0, new Date().toISOString(), id)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
