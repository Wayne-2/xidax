import {
  cryptoNetworks,
  networkConfig,
  type CheckoutRequest,
  type CheckoutSession,
  type CryptoInstructions,
  type PaymentInstructions,
  type RegisteredProductPayload,
  type WireInstructions,
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

function randomCode(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function mockInstructions(
  request: CheckoutRequest
): PaymentInstructions {
  if (request.method === "crypto") {
    const network = request.network ?? "usdt";
    const config = networkConfig(network);
    const amount = (request.total / config.rate).toFixed(
      network === "usdt" ? 2 : 6
    );

    const instructions: CryptoInstructions = {
      method: "crypto",
      network,
      currency: config.currency,
      billingCurrency: request.currency,
      amount,
      confirmations: config.confirmations,
      checkoutUrl: "",
      checkoutId: "",
      availableMethods: ["CRYPTO", "NGN_BANK_TRANSFER"],
      excludedMethods: [],
    };

    return instructions;
  }

  const instructions: WireInstructions = {
    method: "wire",
    currency: "NGN",
    billingCurrency: request.currency,
    amount: request.total.toFixed(2),
    checkoutUrl: "",
    checkoutId: "",
    availableMethods: ["CRYPTO", "NGN_BANK_TRANSFER"],
    excludedMethods: [],
  };

  return instructions;
}

function mockSession(request: CheckoutRequest): CheckoutSession {
  const now = Date.now();
  const expiresAt = new Date(
    now + (request.method === "crypto" ? 30 * 60 * 1000 : 48 * 60 * 60 * 1000)
  ).toISOString();

  return {
    id: `chs_${randomCode(16).toLowerCase()}`,
    provider: "bachs",
    status: "awaiting_payment",
    reference: `PCM-${randomCode(6)}`,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    subtotal: request.subtotal,
    shipping: request.shipping,
    total: request.total,
    currency: request.currency,
    lines: request.lines,
    details: request.details,
    instructions: mockInstructions(request),
  };
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
  } | null;

  if (!response.ok) {
    throw new AppError(payload?.error ?? fallback, {
      status: response.status,
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
  if (!API_BASE) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return mockSession(payload);
  }

  return accountRequest<CheckoutSession>("/api/checkout", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function getCheckoutSession(
  id: string
): Promise<CheckoutSession | null> {
  if (!API_BASE) return null;

  return request<CheckoutSession>(`/api/checkout/${id}`);
}

export async function submitPayment(
  id: string
): Promise<{ status: string }> {
  if (!API_BASE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { status: "submitted" };
  }

  return request<{ status: string }>(`/api/checkout/${id}/submit`, {
    method: "POST",
  });
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
