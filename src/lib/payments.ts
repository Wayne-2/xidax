export type RegisteredProductPayload = {
  kind: "pc" | "laptop";
  name: string;
  orderNumber: string;
  purchasedOn: string;
  email: string;
};

export type PaymentMethod = "crypto" | "wire";

export type CryptoNetwork = "btc" | "eth" | "usdt";

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
  confirmations: number;
  rate: number;
}[] = [
  {
    value: "btc",
    label: "Bitcoin",
    currency: "BTC",
    confirmations: 2,
    rate: 96000,
  },
  {
    value: "eth",
    label: "Ethereum",
    currency: "ETH",
    confirmations: 3,
    rate: 3200,
  },
  {
    value: "usdt",
    label: "Tether",
    currency: "USDT",
    confirmations: 1,
    rate: 1,
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
    description: "Pay with Bitcoin, Ethereum or USDT. Settles once the network confirms.",
  },
  {
    value: "wire",
    label: "Wire transfer",
    description: "Bank transfer straight to our account. We release the build once it clears.",
  },
];

export function networkConfig(network: CryptoNetwork) {
  return (
    cryptoNetworks.find((entry) => entry.value === network) ?? cryptoNetworks[0]
  );
}
