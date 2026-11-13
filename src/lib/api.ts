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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

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

function mockAddress(network: string) {
  const prefix =
    network === "btc" ? "bc1q" : network === "eth" ? "0x" : "0x";

  return `${prefix}${randomCode(network === "btc" ? 30 : 36).toLowerCase()}`;
}

function mockInstructions(
  request: CheckoutRequest
): PaymentInstructions {
  if (request.method === "crypto") {
    const network = networkConfig(request.network ?? "btc");
    const amount = (request.total / network.rate).toFixed(
      network.value === "usdt" ? 2 : 6
    );

    const instructions: CryptoInstructions = {
      method: "crypto",
      network: network.value,
      currency: network.currency,
      address: mockAddress(network.value),
      amount,
      confirmations: network.confirmations,
    };

    return instructions;
  }

  const instructions: WireInstructions = {
    method: "wire",
    currency: request.currency,
    amount: request.total.toFixed(2),
    beneficiary: "Pcmart Technologies Ltd",
    bankName: "Pcmart Payments Bank",
    accountNumber: `P${randomCode(8)}`,
    routingCode: "021000021",
    swift: "PCMAGTNG",
    reference: `PCM-${randomCode(6)}`,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

export async function createCheckoutSession(
  payload: CheckoutRequest
): Promise<CheckoutSession> {
  if (!API_BASE) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return mockSession(payload);
  }

  return request<CheckoutSession>("/api/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
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

export { cryptoNetworks };
