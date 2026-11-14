import {
  cryptoNetworks,
  type CheckoutRequest,
  type CheckoutSession,
  type CryptoInstructions,
  type CryptoNetwork,
  type Env,
  type ExcludedMethod,
  type WireInstructions,
} from "./types";

function networkConfig(network: CryptoNetwork) {
  return cryptoNetworks[network] ?? cryptoNetworks.usdt;
}

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
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<T | null> {
  if (!env.BACHS_API_KEY || !env.BACHS_API_BASE) {
    return null;
  }

  const response = await fetch(`${env.BACHS_API_BASE}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.BACHS_API_KEY}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    const detail = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new GatewayAuthError(
        `bachs ${path} rejected the key (${response.status}): ${detail.slice(0, 200)}`
      );
    }

    throw new Error(
      `bachs ${path} failed (${response.status}): ${detail.slice(0, 400)}`
    );
  }

  return (await response.json()) as T;
}

export class GatewayAuthError extends Error {}

const cryptoCurrencyMap: Record<CryptoNetwork, string> = {
  btc: "USDT_TRC20",
  eth: "ETH_ETH",
  usdt: "USDT_TRC20",
  sol: "SOL_SOL",
};

function readStringList(
  source: unknown,
  keys: string[]
): string[] {
  if (!source || typeof source !== "object") return [];

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }
  }

  for (const key of ["instructions", "payment", "data"]) {
    const nested = readStringList(record[key], keys);

    if (nested.length) {
      return nested;
    }
  }

  return [];
}

function readExcluded(source: unknown): ExcludedMethod[] {
  if (!source || typeof source !== "object") return [];

  const record = source as Record<string, unknown>;
  const list = record.excluded_payment_methods;

  if (!Array.isArray(list)) return [];

  return list
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      id: String(entry.payment_method ?? entry.id ?? "unknown"),
      reason: String(entry.reason ?? "not available"),
      limit: entry.limit ? String(entry.limit) : undefined,
      currency: entry.currency ? String(entry.currency) : undefined,
    }));
}

function readString(
  source: unknown,
  keys: string[],
  depth = 0
): string | undefined {
  if (!source || typeof source !== "object" || depth > 3) return undefined;

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  for (const key of ["instructions", "payment", "data", "charge", "session"]) {
    const nested = readString(record[key], keys, depth + 1);

    if (nested) {
      return nested;
    }
  }

  return undefined;
}

type CustomerRecord = {
  id?: string;
  customer_id?: string;
  email?: string;
  customer?: { id?: string };
};

type ProductRecord = {
  id?: string;
  product_id?: string;
  name?: string;
  amount?: number;
  price?: number;
  currency?: string;
};

async function resolveProductId(
  env: Env,
  line: CheckoutRequest["lines"][number],
  currency = "USD"
): Promise<string> {
  if (!env.BACHS_API_KEY || !env.BACHS_API_BASE) {
    return line.id;
  }

  const listed = await bachsRequest<ProductRecord[] | { products?: ProductRecord[] }>(
    env,
    "/v1/products?limit=200",
    { method: "GET" }
  );

  const records = Array.isArray(listed) ? listed : (listed?.products ?? []);
  const match = records.find((record) => record.name === line.name);

  if (match?.id) {
    return match.id;
  }

  const created = await bachsRequest<ProductRecord>(env, "/v1/products", {
    method: "POST",
    body: {
      name: line.name,
      price: { amount: line.price, currency },
      metadata: { reference: line.id, kind: line.kind },
    },
  });

  const id = created?.id ?? created?.product_id;

  if (!id) {
    throw new Error(
      `bachs product creation returned no id: ${JSON.stringify(created).slice(0, 300)}`
    );
  }

  return id;
}

type ResolvedCustomer = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
};

export async function resolveCustomer(
  env: Env,
  details: CheckoutRequest["details"]
): Promise<ResolvedCustomer> {
  if (!env.BACHS_API_KEY || !env.BACHS_API_BASE) {
    return { id: details.email, email: details.email, name: details.name };
  }

  const listed = await bachsRequest<CustomerRecord[] | { customers?: CustomerRecord[] }>(
    env,
    `/v1/customers?email=${encodeURIComponent(details.email)}`,
    { method: "GET" }
  );

  const records = Array.isArray(listed)
    ? listed
    : (listed?.customers ?? []);
  const match = records.find((record) => record.email === details.email);

  if (match?.id) {
    return {
      id: match.id,
      email: match.email ?? details.email,
      name: details.name,
      phone: details.phone,
    };
  }

  const created = await bachsRequest<CustomerRecord>(env, "/v1/customers", {
    method: "POST",
    body: {
      email: details.email,
      name: details.name,
      phone: details.phone,
      country: details.country,
      metadata: { postal_code: details.postalCode },
    },
  });

  const record = created as
    | (CustomerRecord & { data?: CustomerRecord })
    | null
    | undefined;
  const id =
    record?.id ??
    record?.customer_id ??
    record?.customer?.id ??
    record?.data?.id ??
    record?.data?.customer_id;

  if (!id) {
    throw new Error(
      `bachs customer creation returned no id: ${JSON.stringify(created).slice(0, 300)}`
    );
  }

  return {
    id,
    email: details.email,
    name: details.name,
    phone: details.phone,
  };
}

export async function createCryptoInstructions(
  env: Env,
  request: CheckoutRequest,
  reference: string
): Promise<{
  instructions: CryptoInstructions;
  warning?: string;
}> {
  const customer = await resolveCustomer(env, request.details);
  const config = networkConfig(request.network ?? "usdt");
  const bachsCurrency = cryptoCurrencyMap[request.network ?? "usdt"];

  const remote = await bachsRequest<Record<string, unknown>>(
    env,
    env.BACHS_CRYPTO_PATH ?? "/v1/checkout-sessions",
    {
      method: "POST",
      body: {
        payment_method: "CRYPTO",
        currency: bachsCurrency,
        product_cart: await Promise.all(
          request.lines.map(async (line) => ({
            product_id: await resolveProductId(env, line, request.currency),
            quantity: line.quantity,
          }))
        ),
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
        },
        reference,
        metadata: {
          name: request.details.name,
          phone: request.details.phone,
          country: request.details.country,
          postal_code: request.details.postalCode,
        },
      },
    }
  );

  if (remote) {
    return {
      instructions: {
        method: "crypto",
        network: request.network ?? "usdt",
        currency: bachsCurrency,
        billingCurrency:
          readString(remote, ["billing_currency"]) ?? request.currency,
        amount:
          readString(remote, ["amount", "amount_due", "total"]) ??
          request.total.toFixed(2),
        confirmations: config.confirmations,
        checkoutUrl: readString(remote, ["checkout_url"]) ?? "",
        checkoutId: readString(remote, ["checkout_id"]) ?? "",
        availableMethods: readStringList(remote, ["available_payment_methods"]),
        excludedMethods: readExcluded(remote),
      },
    };
  }

  return {
    instructions: {
      method: "crypto",
      network: request.network ?? "usdt",
      currency: bachsCurrency,
      billingCurrency: request.currency,
      amount: (request.total / config.rate).toFixed(
        (request.network ?? "usdt") === "usdt" ? 2 : 6
      ),
      confirmations: config.confirmations,
      checkoutUrl: "",
      checkoutId: "",
      availableMethods: ["CRYPTO", "NGN_BANK_TRANSFER"],
      excludedMethods: [],
    },
    warning: `Live ${config.label} deposit addresses are unavailable until the bachs key has the customers:write and payments:write scopes.`,
  };
}

export async function createWireInstructions(
  env: Env,
  request: CheckoutRequest,
  reference: string
): Promise<{
  instructions: WireInstructions;
  warning?: string;
}> {
  const customer = await resolveCustomer(env, request.details);

  const remote = await bachsRequest<Record<string, unknown>>(
    env,
    env.BACHS_WIRE_PATH ?? "/v1/checkout-sessions",
    {
      method: "POST",
      body: {
        payment_method: "NGN_BANK_TRANSFER",
        currency: "NGN",
        product_cart: await Promise.all(
          request.lines.map(async (line) => ({
            product_id: await resolveProductId(env, line, request.currency),
            quantity: line.quantity,
          }))
        ),
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
        },
        reference,
        metadata: {
          name: request.details.name,
          phone: request.details.phone,
          country: request.details.country,
          postal_code: request.details.postalCode,
        },
      },
    }
  );

  if (remote) {
    return {
      instructions: {
        method: "wire",
        currency: readString(remote, ["currency"]) ?? "NGN",
        billingCurrency:
          readString(remote, ["billing_currency"]) ?? request.currency,
        amount:
          readString(remote, ["amount", "amount_due", "total"]) ??
          request.total.toFixed(2),
        checkoutUrl: readString(remote, ["checkout_url"]) ?? "",
        checkoutId: readString(remote, ["checkout_id"]) ?? "",
        availableMethods: readStringList(remote, ["available_payment_methods"]),
        excludedMethods: readExcluded(remote),
      },
    };
  }

  return {
    instructions: {
      method: "wire",
      currency: "NGN",
      billingCurrency: request.currency,
      amount: request.total.toFixed(2),
      checkoutUrl: "",
      checkoutId: "",
      availableMethods: ["CRYPTO", "NGN_BANK_TRANSFER"],
      excludedMethods: [],
    },
    warning:
      "Live wire instructions are unavailable until the bachs key has the customers:write and transfers:write scopes.",
  };
}

export async function confirmGatewayPayment(
  env: Env,
  checkoutId: string
): Promise<boolean> {
  if (!env.BACHS_API_KEY || !env.BACHS_API_BASE || !checkoutId) {
    return false;
  }

  try {
    await bachsRequest<Record<string, unknown>>(
      env,
      `/v1/checkout-sessions/${checkoutId}/confirm`,
      { method: "POST", body: {} }
    );
    return true;
  } catch {
    return false;
  }
}

export function buildSession(
  request: CheckoutRequest,
  instructions: CheckoutSession["instructions"],
  reference: string,
  warning?: string
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
    gatewayWarning: warning,
  };
}
