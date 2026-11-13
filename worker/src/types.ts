export type PaymentMethod = "crypto" | "wire";

export type CryptoNetwork = "btc" | "eth" | "usdt";

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

export type CryptoInstructions = {
  method: "crypto";
  network: CryptoNetwork;
  currency: string;
  address: string;
  amount: string;
  confirmations: number;
};

export type WireInstructions = {
  method: "wire";
  currency: string;
  amount: string;
  beneficiary: string;
  bankName: string;
  accountNumber: string;
  routingCode: string;
  swift: string;
  reference: string;
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
};

export type RegisteredProductPayload = {
  kind: "pc" | "laptop";
  name: string;
  orderNumber: string;
  purchasedOn: string;
  email: string;
};

export type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  BACHS_API_KEY?: string;
  BACHS_API_BASE?: string;
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
};
