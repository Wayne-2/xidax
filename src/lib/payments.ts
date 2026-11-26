export type RegisteredProductPayload = {
  kind: "pc" | "laptop";
  name: string;
  orderNumber: string;
  purchasedOn: string;
  email: string;
};

export type PaymentMethod = "card" | "crypto" | "wire";

export type CryptoNetwork =
  | "btc"
  | "eth"
  | "bnb"
  | "doge"
  | "ltc"
  | "xrp"
  | "sol"
  | "usdc"
  | "usdt_trc20"
  | "usdt_erc20"
  | "trx"
  | "matic"
  | "avax";

export type PaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "awaiting_admin"
  | "submitted"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "expired"
  | "failed";

/** Masked card data only — full PAN/CVV are never stored. */
export type CardSummary = {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  holderName: string;
};

export type WireDetails = {
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing?: string;
  swift?: string;
  reference?: string;
};

/** Proof the customer submitted for a manual crypto/wire transfer. */
export type PaymentProof = {
  txHash: string;
  note?: string;
  submittedAt: string;
};

export type CryptoWallet = {
  id: string;
  label: string;
  network: CryptoNetwork;
  currency: string;
  address: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CheckoutLine = {
  id: string;
  name: string;
  kind: string;
  price: number;
  quantity: number;
};

export type DeliveryMethod = "standard" | "express";

export type CheckoutDetails = {
  email: string;
  marketingOptIn: boolean;
  firstName: string;
  lastName: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  /** Legacy compatibility for older sessions/orders. */
  name?: string;
  postalCode?: string;
};

export type CardInstructions = {
  method: "card";
  amount: string;
  billingCurrency: string;
  cardSummary?: CardSummary;
};

export type CryptoInstructions = {
  method: "crypto";
  walletId: string;
  walletLabel: string;
  network: CryptoNetwork;
  currency: string;
  address: string;
  amount: string;
  billingCurrency: string;
  confirmations: number;
};

export type WireInstructions = {
  method: "wire";
  amount: string;
  billingCurrency: string;
  wireDetails?: WireDetails;
};

export type PaymentInstructions =
  | CardInstructions
  | CryptoInstructions
  | WireInstructions;

export type CheckoutRequest = {
  lines: CheckoutLine[];
  details: CheckoutDetails;
  method: PaymentMethod;
  walletId?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  promoCode?: string;
  discountCode?: string;
};

export type CheckoutSession = {
  id: string;
  status: PaymentStatus;
  reference: string;
  method: PaymentMethod;
  createdAt: string;
  expiresAt: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  promoCode?: string;
  discountCode?: string;
  total: number;
  currency: string;
  lines: CheckoutLine[];
  details: CheckoutDetails;
  instructions: PaymentInstructions;
  cardSummary?: CardSummary | null;
  walletId?: string | null;
  wireDetails?: WireDetails | null;
  receiptSentAt?: string | null;
  paymentProof?: PaymentProof | null;
};

export type CardDetailsInput = {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  holderName: string;
};

/** Per-method session lifetimes (milliseconds) — must match the Worker. */
export const METHOD_TTL_MS: Record<PaymentMethod, number> = {
  card: 15 * 60 * 1000,
  crypto: 30 * 60 * 1000,
  wire: 48 * 60 * 60 * 1000,
};

export const paymentMethods: {
  value: PaymentMethod;
  label: string;
  description: string;
  badge?: string;
  index: string;
}[] = [
  {
    value: "crypto",
    label: "Crypto",
    description: "USDC, USDT, BTC, ETH.",
    badge: "Faster",
    index: "01",
  },
  {
    value: "card",
    label: "Card",
    description: "Visa, Mastercard, Amex.",
    index: "02",
  },
  {
    value: "wire",
    label: "Wire transfer",
    description: "Ships after funds arrive.",
    index: "03",
  },
];

export const DELIVERY_OPTIONS = {
  standard: { id: "standard", label: "Standard delivery", description: "3–5 business days", days: [3, 5] as const, price: 0 },
  express: { id: "express", label: "Express delivery", description: "1–2 business days", days: [1, 2] as const, price: 18 },
} as const;

export function estimateDeliveryDate(days: number, from = new Date()) {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date;
}

export function formatDeliveryWindow(method: DeliveryMethod, from = new Date()) {
  const option = DELIVERY_OPTIONS[method];
  const start = estimateDeliveryDate(option.days[0], from);
  const end = estimateDeliveryDate(option.days[1], from);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startLabel}–${endLabel}`;
}

export function getCheckoutCustomerName(details: CheckoutDetails) {
  const explicit = `${details.firstName ?? ""} ${details.lastName ?? ""}`.trim();
  if (explicit) return explicit;
  return (details.name ?? "").trim();
}

export function getCheckoutPostalCode(details: CheckoutDetails) {
  return (details.zipCode ?? details.postalCode ?? "").trim();
}

export function formatCheckoutAddress(details: CheckoutDetails) {
  const line1 = [details.address, details.apartment].filter(Boolean).join(", ");
  const line2 = [details.city, details.state, getCheckoutPostalCode(details)].filter(Boolean).join(", ");
  return [line1, line2, details.country].filter(Boolean).join(", ");
}

export const cryptoNetworks: {
  value: CryptoNetwork;
  label: string;
  currency: string;
  chain: string;
  confirmations: number;
  /** Hardcoded USD rate used for the deposit preview. Mirrors the Worker. */
  rate: number;
  decimals: number;
}[] = [
  {
    value: "usdt_trc20",
    label: "Tether",
    currency: "USDT",
    chain: "TRC20",
    confirmations: 1,
    rate: 1,
    decimals: 2,
  },
  {
    value: "usdt_erc20",
    label: "Tether",
    currency: "USDT",
    chain: "ERC20",
    confirmations: 3,
    rate: 1,
    decimals: 2,
  },
  {
    value: "usdc",
    label: "USD Coin",
    currency: "USDC",
    chain: "Ethereum",
    confirmations: 3,
    rate: 1,
    decimals: 2,
  },
  {
    value: "btc",
    label: "Bitcoin",
    currency: "BTC",
    chain: "Bitcoin",
    confirmations: 2,
    rate: 96000,
    decimals: 6,
  },
  {
    value: "eth",
    label: "Ethereum",
    currency: "ETH",
    chain: "Ethereum",
    confirmations: 3,
    rate: 3200,
    decimals: 6,
  },
  {
    value: "bnb",
    label: "BNB",
    currency: "BNB",
    chain: "BNB Chain",
    confirmations: 3,
    rate: 650,
    decimals: 5,
  },
  {
    value: "sol",
    label: "Solana",
    currency: "SOL",
    chain: "Solana",
    confirmations: 1,
    rate: 150,
    decimals: 4,
  },
  {
    value: "doge",
    label: "Dogecoin",
    currency: "DOGE",
    chain: "Dogecoin",
    confirmations: 2,
    rate: 0.12,
    decimals: 2,
  },
  {
    value: "ltc",
    label: "Litecoin",
    currency: "LTC",
    chain: "Litecoin",
    confirmations: 2,
    rate: 100,
    decimals: 5,
  },
  {
    value: "xrp",
    label: "XRP",
    currency: "XRP",
    chain: "XRP Ledger",
    confirmations: 1,
    rate: 0.6,
    decimals: 2,
  },
  {
    value: "trx",
    label: "TRON",
    currency: "TRX",
    chain: "TRON",
    confirmations: 1,
    rate: 0.25,
    decimals: 2,
  },
  {
    value: "matic",
    label: "Polygon",
    currency: "MATIC",
    chain: "Polygon",
    confirmations: 2,
    rate: 0.45,
    decimals: 4,
  },
  {
    value: "avax",
    label: "Avalanche",
    currency: "AVAX",
    chain: "Avalanche",
    confirmations: 2,
    rate: 25,
    decimals: 4,
  },
];

export function networkConfig(network: CryptoNetwork) {
  return (
    cryptoNetworks.find((entry) => entry.value === network) ?? cryptoNetworks[0]
  );
}

/** Converts an order total into a crypto amount for the deposit preview. */
export function cryptoAmountFor(total: number, network: CryptoNetwork): string {
  const config = networkConfig(network);
  return (total / config.rate).toFixed(config.decimals);
}

export function formatCountdown(remainingMs: number) {
  const remaining = Math.max(0, remainingMs);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
