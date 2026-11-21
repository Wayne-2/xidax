export type PaymentMethod = "card" | "crypto" | "wire";

export type CryptoNetwork = "btc" | "eth" | "usdt" | "sol";

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

export type CheckoutDetails = {
  name: string;
  email: string;
  phone: string;
  country: string;
  postalCode: string;
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

export const cryptoNetworks: Record<
  CryptoNetwork,
  { label: string; currency: string; confirmations: number; rate: number }
> = {
  btc: { label: "Bitcoin", currency: "BTC", confirmations: 2, rate: 96000 },
  eth: { label: "Ethereum", currency: "ETH", confirmations: 3, rate: 3200 },
  usdt: { label: "Tether", currency: "USDT", confirmations: 1, rate: 1 },
  sol: { label: "Solana", currency: "SOL", confirmations: 1, rate: 150 },
};

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
