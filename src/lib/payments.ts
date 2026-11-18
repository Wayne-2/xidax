export type RegisteredProductPayload = {
  kind: "pc" | "laptop";
  name: string;
  orderNumber: string;
  purchasedOn: string;
  email: string;
};

export type PaymentMethod = "crypto" | "wire";

export type CryptoNetwork = "eth" | "usdt" | "sol";

export type PaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "submitted"
  | "paid"
  | "expired"
  | "failed";

export type PaymentProvider = "bachs";

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
  promoCode?: string;
};

export type CheckoutSession = {
  id: string;
  provider: PaymentProvider;
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

export const cryptoNetworks: {
  value: CryptoNetwork;
  label: string;
  currency: string;
  chain: string;
  confirmations: number;
  rate: number;
}[] = [
  {
    value: "usdt",
    label: "Tether",
    currency: "USDT",
    chain: "TRC20",
    confirmations: 1,
    rate: 1,
  },
  {
    value: "eth",
    label: "Ethereum",
    currency: "ETH",
    chain: "Ethereum",
    confirmations: 3,
    rate: 3200,
  },
  {
    value: "sol",
    label: "Solana",
    currency: "SOL",
    chain: "Solana",
    confirmations: 1,
    rate: 150,
  },
];

export const paymentMethods: {
  value: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "crypto",
    label: "Crypto",
    description:
      "Pay with USDT, Ethereum or Solana. Settles once the network confirms.",
  },
  {
    value: "wire",
    label: "Wire transfer",
    description:
      "Bank transfer straight to our account. We release the build once it clears.",
  },
];

export const gatewayMethodLabels: Record<string, string> = {
  CRYPTO: "Cryptocurrency",
  NGN_BANK_TRANSFER: "Naira bank transfer",
  NGN_CARD: "Naira card",
  USD_CARD: "USD card",
};

export function networkConfig(network: CryptoNetwork) {
  return (
    cryptoNetworks.find((entry) => entry.value === network) ?? cryptoNetworks[0]
  );
}
