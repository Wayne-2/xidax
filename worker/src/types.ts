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

/** Masked card data only — full PAN/CVV are never persisted. */
export type CardSummary = {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  holderName: string;
};

/** Bank account details the admin forwards for a wire order. */
export type WireDetails = {
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing?: string;
  swift?: string;
  reference?: string;
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
  marketingOptIn?: boolean;
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

export type CryptoWallet = {
  id: string;
  label: string;
  network: CryptoNetwork;
  currency: string;
  address: string;
  qrCodeUrl?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  qrCodeUrl?: string | null;
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
  /** Customer-submitted proof (tx hash / transfer reference). */
  paymentProof?: PaymentProof | null;
};

/** Proof the customer says they paid — stored on the session and order. */
export type PaymentProof = {
  txHash: string;
  note?: string;
  submittedAt: string;
};

export type RegisteredProductPayload = {
  kind: "pc" | "laptop";
  name: string;
  orderNumber: string;
  purchasedOn: string;
  email: string;
};

/**
 * Worker bindings and secrets.
 *
 * Note: there is deliberately no `FIRESTORE` binding. Firestore is reached
 * through the Firebase Admin SDK, which is initialised from FIREBASE_CONFIG
 * (see `ensureInitialized` in ./auth).
 */
export type Env = {
  /** Cloudflare D1 database used for users, sessions and OTP records. */
  DB: D1Database;
  /** Cloudflare R2 bucket for uploaded product images. */
  MEDIA: R2Bucket;
  /** KV namespace (also holds rate-limit keys with a ratelimit: prefix). */
  SESSIONS: KVNamespace;
  /** Cloudflare Workers AI binding for the support chatbot. */
  AI: Ai;
  /** JSON blob with the Firebase project config plus a service account key. */
  FIREBASE_CONFIG?: string;
  /** Secret pepper used when hashing email OTPs. */
  OTP_SECRET?: string;
  /** Resend API key used to deliver verification emails. */
  RESEND_API_KEY?: string;
  /** Origins allowed to call the auth endpoints, comma separated. */
  ALLOWED_ORIGINS?: string;
  CRON_SECRET?: string;
};

export type CryptoNetworkConfig = {
  label: string;
  currency: string;
  chain: string;
  confirmations: number;
  /** Hardcoded USD rate used to convert the order total into crypto. */
  rate: number;
  /** Decimal places shown for the crypto amount. */
  decimals: number;
};

export const cryptoNetworks: Record<CryptoNetwork, CryptoNetworkConfig> = {
  btc: { label: "Bitcoin", currency: "BTC", chain: "Bitcoin", confirmations: 2, rate: 96000, decimals: 6 },
  eth: { label: "Ethereum", currency: "ETH", chain: "Ethereum", confirmations: 3, rate: 3200, decimals: 6 },
  bnb: { label: "BNB", currency: "BNB", chain: "BNB Chain", confirmations: 3, rate: 650, decimals: 5 },
  doge: { label: "Dogecoin", currency: "DOGE", chain: "Dogecoin", confirmations: 2, rate: 0.12, decimals: 2 },
  ltc: { label: "Litecoin", currency: "LTC", chain: "Litecoin", confirmations: 2, rate: 100, decimals: 5 },
  xrp: { label: "XRP", currency: "XRP", chain: "XRP Ledger", confirmations: 1, rate: 0.6, decimals: 2 },
  sol: { label: "Solana", currency: "SOL", chain: "Solana", confirmations: 1, rate: 150, decimals: 4 },
  usdc: { label: "USD Coin", currency: "USDC", chain: "Ethereum", confirmations: 3, rate: 1, decimals: 2 },
  usdt_trc20: { label: "Tether", currency: "USDT", chain: "TRC20", confirmations: 1, rate: 1, decimals: 2 },
  usdt_erc20: { label: "Tether", currency: "USDT", chain: "ERC20", confirmations: 3, rate: 1, decimals: 2 },
  trx: { label: "TRON", currency: "TRX", chain: "TRON", confirmations: 1, rate: 0.25, decimals: 2 },
  matic: { label: "Polygon", currency: "MATIC", chain: "Polygon", confirmations: 2, rate: 0.45, decimals: 4 },
  avax: { label: "Avalanche", currency: "AVAX", chain: "Avalanche", confirmations: 2, rate: 25, decimals: 4 },
};

/** Every valid network key — used by admin wallet validation. */
export const CRYPTO_NETWORKS = new Set<string>(Object.keys(cryptoNetworks));

/** Per-method session lifetimes (milliseconds). */
export const METHOD_TTL_MS: Record<PaymentMethod, number> = {
  card: 15 * 60 * 1000,
  crypto: 30 * 60 * 1000,
  wire: 48 * 60 * 60 * 1000,
};

export const PAYMENT_METHODS = new Set<PaymentMethod>(["card", "crypto", "wire"]);

/** Statuses that are finished — never auto-expired. */
export const TERMINAL_STATUSES = new Set<PaymentStatus>([
  "paid",
  "failed",
  "expired",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
