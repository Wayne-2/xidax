"use client";

import { getIdToken } from "@/lib/firebase-client";
import type {
  CardSummary,
  CryptoNetwork,
  PaymentProof,
  WireDetails,
} from "@/lib/payments";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

export type AdminOrderLine = {
  id: string;
  productId: string;
  name: string;
  kind: string | null;
  price: number;
  quantity: number;
};

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
  lines: AdminOrderLine[];
};

export type AdminOrderList = {
  orders: AdminOrder[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminOrderStats = {
  totalOrders: number;
  revenue: number;
  orderValue: number;
  byStatus: { status: string; count: number }[];
  recent: { created_at: string; total: number }[];
};

export type AdminApiError = {
  error: string;
  status: number;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const idToken = await getIdToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    const error: AdminApiError = {
      error: payload?.error ?? "Something went wrong.",
      status: response.status,
    };
    throw error;
  }

  return payload as T;
}

export function fetchAdminOrders(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();

  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return adminFetch<AdminOrderList>(`/api/admin/orders${suffix}`);
}

export function fetchAdminOrderStats() {
  return adminFetch<AdminOrderStats>("/api/admin/orders/stats");
}

export function fetchAdminOrder(id: string) {
  return adminFetch<AdminOrder>(`/api/admin/orders/${encodeURIComponent(id)}`);
}

export function updateAdminOrderStatus(id: string, status: string) {
  return adminFetch<{ ok: boolean; status: string }>(
    `/api/admin/orders/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

/** Admin posts bank account details for a wire order (customer is notified). */
export function submitWireDetails(
  orderId: string,
  details: WireDetails
) {
  return adminFetch<{ ok: boolean; session: unknown }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/wire-details`,
    {
      method: "POST",
      body: JSON.stringify(details),
    }
  );
}

/* ---------------- Crypto wallets ---------------- */

export type AdminWalletInput = {
  label: string;
  network: CryptoNetwork | string;
  currency: string;
  address: string;
  qrCodeUrl?: string | null;
  active?: boolean;
};

export function fetchAdminWallets() {
  return adminFetch<{ wallets: AdminWallet[] }>("/api/admin/wallets");
}

export function createAdminWallet(input: AdminWalletInput) {
  return adminFetch<{ wallet: AdminWallet }>("/api/admin/wallets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminWallet(id: string, patch: Partial<AdminWalletInput>) {
  return adminFetch<{ wallet: AdminWallet }>(
    `/api/admin/wallets/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
}

export function deleteAdminWallet(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/wallets/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

/* ---------------- Bank accounts (wire) ---------------- */

export type AdminBankAccountInput = {
  label: string;
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing?: string;
  swift?: string;
  currency?: string;
  active?: boolean;
};

export type AdminBankAccount = {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing: string | null;
  swift: string | null;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function fetchAdminBankAccounts() {
  return adminFetch<{ accounts: AdminBankAccount[] }>(
    "/api/admin/bank-accounts"
  );
}

export function createAdminBankAccount(input: AdminBankAccountInput) {
  return adminFetch<{ account: AdminBankAccount }>("/api/admin/bank-accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminBankAccount(
  id: string,
  patch: Partial<AdminBankAccountInput>
) {
  return adminFetch<{ account: AdminBankAccount }>(
    `/api/admin/bank-accounts/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
}

export function deleteAdminBankAccount(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/bank-accounts/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export function fetchAdminConfig() {
  return adminFetch<{ supportEmail: string }>("/api/admin/config");
}

export function updateAdminConfig(patch: { supportEmail?: string }) {
  return adminFetch<{ supportEmail: string }>("/api/admin/config", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/* ---------------- Users ---------------- */

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  postalCode: string;
  tier: string;
  emailVerified: boolean;
  createdAt: string;
  orders: number;
  products: number;
  hasPendingOtp: boolean;
};

export type AdminUserList = {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUserStats = {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
};

export function fetchAdminUsers(params?: {
  search?: string;
  verified?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();

  if (params?.search) query.set("search", params.search);
  if (params?.verified && params.verified !== "all") query.set("verified", params.verified);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return adminFetch<AdminUserList>(`/api/admin/users${suffix}`);
}

export function fetchAdminUserStats() {
  return adminFetch<AdminUserStats>("/api/admin/users/stats");
}

/* ---------------- Admin allowlist ---------------- */

export type AdminEntry = {
  email: string;
  createdAt: string;
  createdBy: string | null;
};

export function fetchAdmins() {
  return adminFetch<{ admins: AdminEntry[] }>("/api/admin/admins");
}

export function addAdmin(email: string) {
  return adminFetch<{ ok: boolean; email: string }>("/api/admin/admins", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function removeAdmin(email: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/admins/${encodeURIComponent(email)}`,
    { method: "DELETE" }
  );
}

/* ---------------- Products ---------------- */

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

export type ProductInput = {
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
};

export function fetchAdminProducts() {
  return adminFetch<{ products: Product[] }>("/api/admin/products");
}

export function fetchAdminProduct(id: string) {
  return adminFetch<{ product: Product }>(
    `/api/admin/products/${encodeURIComponent(id)}`
  );
}

export function createProduct(input: ProductInput) {
  return adminFetch<{ product: Product }>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(id: string, input: ProductInput) {
  return adminFetch<{ product: Product }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export function deleteProduct(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export function setProductPublished(id: string, published: boolean) {
  return adminFetch<{ ok: boolean; published: boolean }>(
    `/api/admin/products/${encodeURIComponent(id)}/publish`,
    {
      method: "PATCH",
      body: JSON.stringify({ published }),
    }
  );
}

/** Uploads an image and returns the URL to store on a product. */
export async function uploadProductImage(file: File): Promise<{ url: string; key: string }> {
  const idToken = await getIdToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { url?: string; key?: string; error?: string }
    | null;

  if (!response.ok) {
    throw {
      error: payload?.error ?? "Could not upload image.",
      status: response.status,
    } satisfies AdminApiError;
  }

  return { url: payload!.url!, key: payload!.key! };
}

/* ---------------- Catalog (laptops / consoles) ---------------- */

export type CatalogItem = {
  id: string;
  data: Record<string, unknown>;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CatalogKind = "laptops" | "consoles";

export function fetchCatalog(kind: CatalogKind) {
  return adminFetch<{ items: CatalogItem[] }>(`/api/admin/${kind}`);
}

export function saveCatalogItem(
  kind: CatalogKind,
  data: Record<string, unknown>,
  id?: string
) {
  return adminFetch<{ item: CatalogItem }>(`/api/admin/${kind}${id ? `/${encodeURIComponent(id)}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify({ data }),
  });
}

export function deleteCatalogItem(kind: CatalogKind, id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/${kind}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export function setCatalogPublished(kind: CatalogKind, id: string, published: boolean) {
  return adminFetch<{ ok: boolean; published: boolean }>(
    `/api/admin/${kind}/${encodeURIComponent(id)}/publish`,
    { method: "PATCH", body: JSON.stringify({ published }) }
  );
}

/** Admin action: mark a user's email as verified. */
export function verifyAdminUser(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/users/${encodeURIComponent(id)}/verify`,
    { method: "PATCH" }
  );
}

/** Asks the Worker to generate a unique promo code. */
export function generatePromoCode() {
  return adminFetch<{ code: string }>("/api/admin/promo-code", {
    method: "POST",
  });
}

/* ---------------- User promos ---------------- */

export type UserPromo = {
  uid: string;
  code: string;
  discount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function fetchUserPromo(uid: string) {
  return adminFetch<{ promo: UserPromo | null }>(
    `/api/admin/users/${encodeURIComponent(uid)}/promo`
  );
}

export function assignUserPromo(uid: string, code: string, discount: number) {
  return adminFetch<{ promo: UserPromo }>(
    `/api/admin/users/${encodeURIComponent(uid)}/promo`,
    { method: "POST", body: JSON.stringify({ code, discount }) }
  );
}

export function deleteUserPromo(uid: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/users/${encodeURIComponent(uid)}/promo`,
    { method: "DELETE" }
  );
}

export function setUserPromoActive(uid: string, active: boolean) {
  return adminFetch<{ ok: boolean; active: boolean }>(
    `/api/admin/users/${encodeURIComponent(uid)}/promo/active`,
    { method: "PATCH", body: JSON.stringify({ active }) }
  );
}

export function generateUserPromoCode() {
  return adminFetch<{ code: string }>("/api/admin/promo-code", {
    method: "POST",
  });
}

export type AdminWallet = {
  id: string;
  label: string;
  network: CryptoNetwork;
  currency: string;
  address: string;
  qrCodeUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/* ---------------- Giveaway ---------------- */

export type AdminGiveawayPrize = {
  name: string;
  description: string;
  images: string[];
};

export type AdminGiveawayStatus = {
  closesAt: string;
  closed: boolean;
  entered: boolean;
  totalEntries: number;
  prize: AdminGiveawayPrize | null;
};

export function fetchAdminGiveaway() {
  return adminFetch<AdminGiveawayStatus>("/api/admin/giveaway");
}

export function updateAdminGiveawayClosing(closesAt: string) {
  return adminFetch<{ ok: boolean; status: AdminGiveawayStatus }>(
    "/api/admin/giveaway",
    { method: "PUT", body: JSON.stringify({ closesAt }) }
  );
}

export function updateAdminGiveawayPrize(prize: AdminGiveawayPrize | null) {
  return adminFetch<{ ok: boolean; status: AdminGiveawayStatus }>(
    "/api/admin/giveaway",
    { method: "PUT", body: JSON.stringify({ prize }) }
  );
}
