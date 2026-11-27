import {
  cryptoNetworks,
  type CardDetailsInput,
  type CheckoutRequest,
  type CheckoutSession,
  type CryptoWallet,
  type RegisteredProductPayload,
} from "@/lib/payments";
import { AppError, isOffline } from "@/lib/errors";

const DEFAULT_API_BASE = "https://generic-pcs-api.pcmarketweb.workers.dev";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE).replace(
  /\/+$/,
  ""
);

export function remotePaymentsEnabled() {
  return Boolean(API_BASE);
}






const REQUEST_TIMEOUT_MS = 25000;

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
  };
}

async function send<T>(
  path: string,
  init: RequestInit | undefined,
  fallback: string,
  token?: string | null
): Promise<T> {
  const timeout = withTimeout();

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: timeout.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(
        "That took longer than expected. Please try again.",
        { code: "timeout" }
      );
    }

    throw new AppError(
      isOffline()
        ? "You appear to be offline. Check your connection and try again."
        : "We could not reach the store. Please try again in a moment.",
      { offline: true, code: "network" }
    );
  } finally {
    timeout.dispose();
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    session?: CheckoutSession;
  } | null;

  if (!response.ok) {
    throw new AppError(payload?.error ?? fallback, {
      status: response.status,
      payload: payload?.session ? { session: payload.session } : undefined,
    });
  }

  return payload as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return send<T>(path, init, "The store could not complete that request.");
}

export async function createCheckoutSession(
  payload: CheckoutRequest,
  token?: string | null
): Promise<CheckoutSession> {
  return accountRequest<CheckoutSession>("/api/checkout", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function getCheckoutSession(
  id: string
): Promise<CheckoutSession | null> {
  try {
    return await request<CheckoutSession>(`/api/checkout/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) return null;
    throw error;
  }
}

/** Public list of active crypto wallets shown at checkout. */
export async function fetchWallets(): Promise<{ wallets: CryptoWallet[] }> {
  return request<{ wallets: CryptoWallet[] }>("/api/wallets");
}

/** Card rail is a placeholder — always fails; session comes back as `failed`. */
export const CARD_PAYMENT_UNAVAILABLE =
  "Card payment is unavailable right now. Please pay with crypto or wire transfer instead.";

export async function submitCardDetails(
  id: string,
  card: CardDetailsInput
): Promise<{ status: string; session: CheckoutSession }> {
  return request<{ status: string; session: CheckoutSession }>(
    `/api/checkout/${encodeURIComponent(id)}/card`,
    { method: "POST", body: JSON.stringify(card) }
  );
}

/** Crypto/wire: user asserts the transfer has been sent. */
export async function confirmPayment(
  id: string
): Promise<{ status: string; session: CheckoutSession }> {
  return request<{ status: string; session: CheckoutSession }>(
    `/api/checkout/${encodeURIComponent(id)}/confirm`,
    { method: "POST" }
  );
}

export async function notifyWirePending(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/checkout/${encodeURIComponent(id)}/wire-notify`, { method: "POST" });
}

export async function sendCheckoutOtp(email: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/checkout/send-otp", { method: "POST", body: JSON.stringify({ email }) });
}

export async function verifyCheckoutOtp(email: string, otp: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/checkout/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
}

export async function updateCheckoutWallet(
  id: string,
  walletId: string
): Promise<{ status: string; session: CheckoutSession }> {
  return request<{ status: string; session: CheckoutSession }>(`/api/checkout/${encodeURIComponent(id)}/wallet`, { method: "POST", body: JSON.stringify({ walletId }) });
}

/** Crypto/wire: customer submits tx hash / transfer reference as proof. */
export async function submitPaymentProof(
  id: string,
  payload: { txHash: string; note?: string }
): Promise<{ status: string; session: CheckoutSession }> {
  return request<{ status: string; session: CheckoutSession }>(
    `/api/checkout/${encodeURIComponent(id)}/proof`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function registerProductRemote(payload: RegisteredProductPayload): Promise<{
  ok: boolean;
  labelNumber?: string;
  trackingNumber?: string;
}> {
  if (!API_BASE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  return request<{
    ok: boolean;
    labelNumber?: string;
    trackingNumber?: string;
  }>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AccountUserPayload = {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  postalCode: string;
  tier: string;
  memberSince: string;
  createdAt: string;
  emailVerified: boolean;
};

export type AccountSettingsPayload = {
  orderUpdates: boolean;
  dropNotifications: boolean;
  marketingEmails: boolean;
  language: string;
  currency: string;
};

export type AccountOrderPayload = {
  id: string;
  reference: string;
  title: string;
  detail: string;
  total: number;
  currency: string;
  status: string;
  method: string;
  date: string;
  href: string;
  createdAt: string;
};

export type AccountProductPayload = {
  id: string;
  kind: "pc" | "laptop";
  name: string;
  orderNumber: string;
  purchasedOn: string;
  labelNumber: string;
  trackingNumber: string;
  createdAt: string;
};

export async function accountRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    headersInit?: Record<string, string>;
  } = {}
): Promise<T> {
  return send<T>(
    path,
    {
      method: options.method ?? "GET",
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      ...(options.headersInit ? { headers: options.headersInit } : {}),
    },
    "We could not reach your account. Please try again.",
    options.token
  );
}

export async function registerAccount(payload: {
  email: string;
  name: string;
  phone: string;
  country: string;
  postalCode: string;
  password: string;
}) {
  // Registration never returns a session — OTP verification must happen first.
  return accountRequest<{
    needsVerification: true;
    email: string;
    user: AccountUserPayload;
  }>("/api/auth/register", { method: "POST", body: payload });
}

export async function loginAccount(idToken: string) {
  return accountRequest<{ token: string; user: AccountUserPayload }>(
    "/api/auth/login",
    { method: "POST", body: { idToken } }
  );
}

export async function logoutAccount(token: string) {
  return accountRequest<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
    token,
  });
}

export async function fetchAccount(token: string) {
  return accountRequest<{
    user: AccountUserPayload;
    settings: AccountSettingsPayload;
    counts: { orders: number; products: number };
  }>("/api/me", { token });
}

export async function updateAccount(
  token: string,
  patch: Partial<AccountUserPayload>
) {
  return accountRequest<{ user: AccountUserPayload }>("/api/me", {
    method: "PATCH",
    body: patch,
    token,
  });
}

export async function fetchAccountOrders(token: string) {
  return accountRequest<{ orders: AccountOrderPayload[] }>("/api/me/orders", {
    token,
  });
}

export async function fetchAccountProducts(token: string) {
  return accountRequest<{ products: AccountProductPayload[] }>(
    "/api/me/products",
    { token }
  );
}

export async function sendMessage(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
  country?: string;
}) {
  return request<{ ok: boolean; id: string }>("/api/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createAccountProduct(
  token: string,
  payload: {
    kind: "pc" | "laptop";
    name: string;
    orderNumber: string;
    purchasedOn: string;
  }
) {
  return accountRequest<{ product: AccountProductPayload }>(
    "/api/me/products",
    { method: "POST", body: payload, token }
  );
}

export async function deleteAccountProduct(token: string, id: string) {
  return accountRequest<{ ok: boolean }>(`/api/me/products/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function updateAccountSettings(
  token: string,
  patch: Partial<AccountSettingsPayload>
) {
  return accountRequest<{ settings: AccountSettingsPayload }>(
    "/api/me/settings",
    { method: "PATCH", body: patch, token }
  );
}

export { cryptoNetworks };

export type UserPromoPayload = {
  code: string;
  discount: number;
  active: boolean;
};

/** Returns the signed-in user's assigned promo, if any. */
export async function fetchMyPromo(token: string) {
  return accountRequest<{ promo: UserPromoPayload | null }>("/api/me/promo", {
    token,
  });
}

export type ProductPromoPayload = {
  code: string;
  discount: number;
  productId: string;
  kind: string;
};

/** Validates a product-level promo code against a specific cart line. */
export async function validateProductPromo(code: string, lineId: string) {
  return accountRequest<{ promo: ProductPromoPayload | null }>(
    "/api/promo/validate",
    { method: "POST", body: { code, lineId } }
  );
}

/* ---------------- Server-backed cart ---------------- */

function cartHeaders(token?: string | null): Record<string, string> {
  const cartId = getCartId();
  const headers: Record<string, string> = { "x-cart-id": cartId };

  if (token) headers.authorization = `Bearer ${token}`;

  return headers;
}

/** Stable client-generated cart identifier. */
export function getCartId(): string {
  if (typeof window === "undefined") return "";

  const key = "genericpcs.cart.id";
  let id = window.localStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }

  return id;
}

export async function fetchCart(token?: string | null) {
  return accountRequest<{ items: import("@/data/cart").CartItem[] }>(
    "/api/cart",
    { token, headersInit: cartHeaders(token) }
  ).catch(() => ({ items: [] as import("@/data/cart").CartItem[] }));
}

export async function addToCartRemote(
  item: import("@/data/cart").CartItem,
  token?: string | null
) {
  return accountRequest<{ items: import("@/data/cart").CartItem[] }>(
    "/api/cart",
    {
      method: "POST",
      body: { item },
      token,
      headersInit: cartHeaders(token),
    }
  );
}

export async function updateCartItemRemote(
  id: string,
  quantity: number,
  token?: string | null
) {
  return accountRequest<{ items: import("@/data/cart").CartItem[] }>(
    "/api/cart",
    {
      method: "PATCH",
      body: { id, quantity },
      token,
      headersInit: cartHeaders(token),
    }
  );
}

export async function removeFromCartRemote(id: string, token?: string | null) {
  return accountRequest<{ items: import("@/data/cart").CartItem[] }>(
    `/api/cart/${encodeURIComponent(id)}`,
    { method: "DELETE", token, headersInit: cartHeaders(token) }
  );
}

export async function clearCartRemote(token?: string | null) {
  return accountRequest<{ items: import("@/data/cart").CartItem[] }>(
    "/api/cart",
    { method: "DELETE", token, headersInit: cartHeaders(token) }
  );
}

/* ---------------- Support chat ---------------- */

export type ChatMessagePayload = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

function chatHeaders(): Record<string, string> {
  return { "x-chat-session": getChatSessionId() };
}

export function getChatSessionId(): string {
  if (typeof window === "undefined") return "";

  const key = "genericpcs.chat.session";
  let id = window.localStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }

  return id;
}

export async function fetchChatHistory() {
  return accountRequest<{ messages: ChatMessagePayload[] }>("/api/chat", {
    headersInit: chatHeaders(),
  });
}

export async function sendChatMessage(message: string) {
  return accountRequest<{
    answer: string;
    suggestions: string[];
  }>("/api/chat", {
    method: "POST",
    body: { message },
    headersInit: chatHeaders(),
  });
}

export async function clearChatHistory() {
  return accountRequest<{ ok: boolean }>("/api/chat", {
    method: "DELETE",
    headersInit: chatHeaders(),
  });
}

/* ---------------- Giveaway ---------------- */

export type GiveawayPrize = {
  name: string;
  description: string;
  images: string[];
  specs?: { label: string; value: string }[];
};

export type GiveawayStatus = {
  closesAt: string;
  closed: boolean;
  entered: boolean;
  totalEntries: number;
  prize: GiveawayPrize | null;
};

function guestHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  if (token) headers.authorization = `Bearer ${token}`;

  if (typeof window !== "undefined") {
    const key = "genericpcs.guest.id";
    let id = window.localStorage.getItem(key);

    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(key, id);
    }

    headers["x-guest-id"] = id;
  }

  return headers;
}

export async function fetchGiveawayStatus(token?: string | null) {
  return accountRequest<GiveawayStatus>("/api/giveaway", {
    token,
    headersInit: guestHeaders(token),
  });
}

export async function redeemGiveaway(
  input: { email: string; name: string; reason: string },
  token?: string | null
) {
  return accountRequest<{ ok: boolean; status: GiveawayStatus }>(
    "/api/giveaway/redeem",
    {
      method: "POST",
      body: input,
      token,
      headersInit: guestHeaders(token),
    }
  );
}


export async function fetchSiteConfig(): Promise<{ supportEmail: string }> {
  return request<{ supportEmail: string }>("/api/site-config");
}
