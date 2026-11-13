import {
  cryptoNetworks,
  type CheckoutRequest,
  type CheckoutSession,
  type CryptoInstructions,
  type CryptoNetwork,
  type Env,
  type WireInstructions,
} from "./types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number) {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return code;
}

async function bachsRequest<T>(
  env: Env,
  path: string,
  body: Record<string, unknown>
): Promise<T | null> {
  if (!env.BACHS_API_KEY || !env.BACHS_API_BASE) {
    return null;
  }

  const response = await fetch(`${env.BACHS_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.BACHS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`bachs request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

export async function createCryptoInstructions(
  env: Env,
  request: CheckoutRequest,
  reference: string
): Promise<CryptoInstructions> {
  const network = (request.network ?? "btc") as CryptoNetwork;
  const config = cryptoNetworks[network];

  const remote = await bachsRequest<{
    address: string;
    amount: string;
  }>(env, "/v1/crypto/intents", {
    reference,
    network,
    amount: request.total,
    currency: request.currency,
    metadata: {
      email: request.details.email,
      name: request.details.name,
    },
  });

  if (remote) {
    return {
      method: "crypto",
      network,
      currency: config.currency,
      address: remote.address,
      amount: remote.amount,
      confirmations: config.confirmations,
    };
  }

  const fallback =
    network === "btc"
      ? env.CRYPTO_ADDRESS_BTC
      : network === "eth"
        ? env.CRYPTO_ADDRESS_ETH
        : env.CRYPTO_ADDRESS_USDT;

  return {
    method: "crypto",
    network,
    currency: config.currency,
    address: fallback ?? `pending-${randomCode(20).toLowerCase()}`,
    amount: (request.total / config.rate).toFixed(
      network === "usdt" ? 2 : 6
    ),
    confirmations: config.confirmations,
  };
}

export async function createWireInstructions(
  env: Env,
  request: CheckoutRequest,
  reference: string
): Promise<WireInstructions> {
  const remote = await bachsRequest<{
    beneficiary: string;
    bankName: string;
    accountNumber: string;
    routingCode: string;
    swift: string;
    amount: string;
  }>(env, "/v1/wire/instructions", {
    reference,
    amount: request.total,
    currency: request.currency,
    accountHolder: request.details.name,
  });

  if (remote) {
    return {
      method: "wire",
      currency: request.currency,
      amount: remote.amount,
      beneficiary: remote.beneficiary,
      bankName: remote.bankName,
      accountNumber: remote.accountNumber,
      routingCode: remote.routingCode,
      swift: remote.swift,
      reference,
    };
  }

  return {
    method: "wire",
    currency: request.currency,
    amount: request.total.toFixed(2),
    beneficiary: env.WIRE_BENEFICIARY ?? "Pcmart Technologies Ltd",
    bankName: env.WIRE_BANK_NAME ?? "Pcmart Payments Bank",
    accountNumber: env.WIRE_ACCOUNT_NUMBER ?? `P${randomCode(8)}`,
    routingCode: env.WIRE_ROUTING_CODE ?? "021000021",
    swift: env.WIRE_SWIFT ?? "PCMAGTNG",
    reference,
  };
}

export function buildSession(
  request: CheckoutRequest,
  instructions: CheckoutSession["instructions"],
  reference: string
): CheckoutSession {
  const now = Date.now();
  const lifetime =
    request.method === "crypto" ? 30 * 60 * 1000 : 48 * 60 * 60 * 1000;

  return {
    id: `chs_${randomCode(16).toLowerCase()}`,
    provider: "bachs",
    status: "awaiting_payment",
    reference,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + lifetime).toISOString(),
    subtotal: request.subtotal,
    shipping: request.shipping,
    total: request.total,
    currency: request.currency,
    lines: request.lines,
    details: request.details,
    instructions,
  };
}
