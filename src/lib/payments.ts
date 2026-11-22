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

export type CheckoutDetails = {
  name: string;
  email: string;
  phone: string;
  country: string;
  postalCode: string;
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
  total: number;
  currency: string;
  promoCode?: string;
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
  discount: number;
  promoCode?: string;
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
  index: string;
}[] = [
  {
    value: "card",
    label: "Card",
    description:
      "Pay by card. We hold a masked summary and an admin reviews the charge within minutes.",
    index: "01",
  },
  {
    value: "crypto",
    label: "Crypto",
    description:
      "Pay with BTC, ETH, USDT, SOL, BNB and more. Deposit preview shows the exact amount.",
    index: "02",
  },
  {
    value: "wire",
    label: "Wire transfer",
    description:
      "Request our bank details, transfer, then confirm. Builds release once the transfer clears.",
    index: "03",
  },
];

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
