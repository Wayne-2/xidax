export type PaymentMethod = "crypto" | "wire";

export type CryptoNetwork = "btc" | "eth" | "usdt" | "sol";

export type PaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "submitted"
  | "paid"
  | "expired"
  | "failed";

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

export type ExcludedMethod = {
  id: string;
  reason: string;
  limit?: string;
  currency?: string;
};

export type CryptoInstructions = {
  method: "crypto";
  network: CryptoNetwork;
  currency: string;
  billingCurrency: string;
  amount: string;
  confirmations: number;
  checkoutUrl: string;
  checkoutId: string;
  availableMethods: string[];
  excludedMethods: ExcludedMethod[];
};

export type WireInstructions = {
  method: "wire";
  currency: string;
  billingCurrency: string;
  amount: string;
  checkoutUrl: string;
  checkoutId: string;
  availableMethods: string[];
  excludedMethods: ExcludedMethod[];
};

export type PaymentInstructions = CryptoInstructions | WireInstructions;

export type CheckoutRequest = {
  lines: CheckoutLine[];
  details: CheckoutDetails;
  method: PaymentMethod;
  network?: CryptoNetwork;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
};

export type CheckoutSession = {
  id: string;
  provider: "bachs";
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  expiresAt: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  lines: CheckoutLine[];
  details: CheckoutDetails;
  instructions: PaymentInstructions;
  gatewayWarning?: string;
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
  /** JSON blob with the Firebase project config plus a service account key. */
  FIREBASE_CONFIG?: string;
  /** Secret pepper used when hashing email OTPs. */
  OTP_SECRET?: string;
  /** Resend API key used to deliver verification emails. */
  RESEND_API_KEY?: string;
  /** Origins allowed to call the auth endpoints, comma separated. */
  ALLOWED_ORIGINS?: string;
  BACHS_API_KEY?: string;
  BACHS_API_BASE?: string;
  BACHS_CRYPTO_PATH?: string;
  BACHS_WIRE_PATH?: string;
  BACHS_WEBHOOK_SECRET?: string;
  CRYPTO_ADDRESS_BTC?: string;
  CRYPTO_ADDRESS_ETH?: string;
  CRYPTO_ADDRESS_USDT?: string;
  WIRE_BANK_NAME?: string;
  WIRE_BENEFICIARY?: string;
  WIRE_ACCOUNT_NUMBER?: string;
  WIRE_ROUTING_CODE?: string;
  WIRE_SWIFT?: string;
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
