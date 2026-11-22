import { describe, expect, it } from "vitest";
import {
  detectCardBrand,
  luhnValid,
  maskCardSummary,
  shouldExpireSession,
} from "../src/checkout";
import { normalize } from "../src/admin-wallets";
import {
  METHOD_TTL_MS,
  type CheckoutSession,
  type PaymentMethod,
  type PaymentStatus,
} from "../src/types";
import {
  buildAdminPaymentAlertHtml,
  buildReceiptEmailHtml,
} from "../src/email";

function session(
  overrides: Partial<CheckoutSession> = {}
): CheckoutSession {
  const method = overrides.method ?? "card";
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const expiresAt = new Date(
    createdAt.getTime() + METHOD_TTL_MS[method]
  ).toISOString();

  return {
    id: "chs_test",
    status: "awaiting_payment",
    reference: "PCM-TEST01",
    method,
    createdAt: createdAt.toISOString(),
    expiresAt,
    subtotal: 100,
    shipping: 0,
    discount: 0,
    total: 100,
    currency: "USD",
    lines: [{ id: "prebuild-p1", name: "PC", kind: "prebuild", price: 100, quantity: 1 }],
    details: {
      name: "Wayne",
      email: "wayne@example.com",
      phone: "+1",
      country: "United States",
      postalCode: "10001",
    },
    instructions:
      method === "card"
        ? { method: "card", amount: "100.00", billingCurrency: "USD" }
        : method === "crypto"
          ? {
              method: "crypto",
              walletId: "w1",
              walletLabel: "USDT",
              network: "usdt_trc20",
              currency: "USDT",
              address: "Tabc",
              amount: "100.00",
              billingCurrency: "USD",
              confirmations: 1,
            }
          : {
              method: "wire",
              amount: "100.00",
              billingCurrency: "USD",
            },
    cardSummary: null,
    walletId: method === "crypto" ? "w1" : null,
    wireDetails: null,
    receiptSentAt: null,
    ...overrides,
  };
}

describe("shouldExpireSession", () => {
  const past = "2020-01-01T00:00:00.000Z";
  const future = "2099-01-01T00:00:00.000Z";

  it("never expires terminal statuses", () => {
    for (const status of [
      "paid",
      "failed",
      "expired",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ] as PaymentStatus[]) {
      expect(
        shouldExpireSession(
          session({ status, expiresAt: past, method: "card" })
        )
      ).toBe(false);
    }
  });

  it("does not expire before the deadline", () => {
    expect(
      shouldExpireSession(
        session({ status: "awaiting_payment", expiresAt: future })
      )
    ).toBe(false);
  });

  it("expires an awaiting_payment session past the deadline", () => {
    expect(
      shouldExpireSession(
        session({ status: "awaiting_payment", expiresAt: past })
      )
    ).toBe(true);
  });

  it("expires an awaiting_admin wire past the deadline", () => {
    expect(
      shouldExpireSession(
        session({ method: "wire", status: "awaiting_admin", expiresAt: past })
      )
    ).toBe(true);
  });

  it("expires a submitted card past the deadline", () => {
    expect(
      shouldExpireSession(
        session({ method: "card", status: "submitted", expiresAt: past })
      )
    ).toBe(true);
  });

  it("keeps a submitted crypto past the deadline for admin approval", () => {
    expect(
      shouldExpireSession(
        session({ method: "crypto", status: "submitted", expiresAt: past })
      )
    ).toBe(false);
  });

  it("keeps a submitted wire past the deadline for admin approval", () => {
    expect(
      shouldExpireSession(
        session({ method: "wire", status: "submitted", expiresAt: past })
      )
    ).toBe(false);
  });

  it("uses per-method TTLs", () => {
    expect(METHOD_TTL_MS.card).toBe(15 * 60 * 1000);
    expect(METHOD_TTL_MS.crypto).toBe(30 * 60 * 1000);
    expect(METHOD_TTL_MS.wire).toBe(48 * 60 * 60 * 1000);
  });
});

describe("card masking", () => {
  it("validates a Luhn number", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
    expect(luhnValid("123")).toBe(false);
  });

  it("detects common brands", () => {
    expect(detectCardBrand("4242424242424242")).toBe("Visa");
    expect(detectCardBrand("5555555555554444")).toBe("Mastercard");
    expect(detectCardBrand("378282246310005")).toBe("Amex");
  });

  it("stores only brand, last4, expiry and holder — never the full PAN", () => {
    const summary = maskCardSummary({
      number: "4242 4242 4242 4242",
      expMonth: "12",
      expYear: "30",
      holderName: "  Wayne Adebayo  ",
    });

    expect(summary).toEqual({
      brand: "Visa",
      last4: "4242",
      expMonth: "12",
      expYear: "30",
      holderName: "Wayne Adebayo",
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("4242424242424242");
    expect(serialized).not.toContain("cvv");
    expect(serialized).not.toContain("number");
  });

  it("normalises short expiry months", () => {
    const summary = maskCardSummary({
      number: "4242424242424242",
      expMonth: "3",
      expYear: "2030",
      holderName: "W",
    });
    expect(summary.expMonth).toBe("03");
    expect(summary.expYear).toBe("30");
  });
});

describe("wallet validation", () => {
  it("accepts a valid wallet", () => {
    const result = normalize({
      label: "USDT treasury",
      network: "USDT_TRC20",
      currency: "usdt",
      address: "TExample",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.network).toBe("usdt_trc20");
    expect(result.value.currency).toBe("USDT");
    expect(result.value.active).toBe(true);
  });

  it("rejects unknown networks", () => {
    const result = normalize({
      label: "X",
      network: "not-a-chain",
      currency: "XXX",
      address: "D",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Network must be one of/i);
  });

  it("accepts popular networks including doge, bnb and usdt variants", () => {
    for (const network of ["doge", "bnb", "usdt_trc20", "usdt_erc20", "xrp"]) {
      const result = normalize({
        label: "W",
        network,
        currency: "X",
        address: "A",
      });
      expect(result.ok).toBe(true);
    }
  });

  it("requires a label and address", () => {
    expect(
      normalize({ label: "", network: "btc", currency: "BTC", address: "a" }).ok
    ).toBe(false);
    expect(
      normalize({ label: "a", network: "btc", currency: "BTC", address: "" }).ok
    ).toBe(false);
  });

  it("defaults active to true and honours active:false", () => {
    const active = normalize({
      label: "a",
      network: "btc",
      currency: "BTC",
      address: "x",
    });
    const inactive = normalize({
      label: "a",
      network: "btc",
      currency: "BTC",
      address: "x",
      active: false,
    });
    expect(active.ok && active.value.active).toBe(true);
    expect(inactive.ok && inactive.value.active).toBe(false);
  });
});

describe("payment emails", () => {
  it("builds a receipt with method and total", () => {
    const html = buildReceiptEmailHtml({
      apiKey: "re_test",
      to: "wayne@example.com",
      reference: "PCM-TEST01",
      customerName: "Wayne",
      lines: [{ name: "PC", quantity: 1, price: 100 }],
      subtotal: 100,
      shipping: 0,
      discount: 0,
      total: 100,
      currency: "USD",
      method: "card",
      paidAt: "2026-01-01T00:00:00.000Z",
    });

    expect(html).toContain("PCM-TEST01");
    expect(html).toContain("Card payment");
    expect(html).toContain("Wayne");
    expect(html).toContain("$100.00");
    expect(html).toContain("<!doctype html>");
  });

  it("builds an admin alert per method", () => {
    const card = buildAdminPaymentAlertHtml({
      kind: "card",
      reference: "PCM-TEST01",
      amount: 100,
      currency: "USD",
      customerName: "Wayne",
      customerEmail: "wayne@example.com",
      detail: "Visa ···· 4242",
    });
    expect(card).toContain("PCM-TEST01");
    expect(card).toContain("Visa");
    expect(card).toContain("wayne@example.com");

    const wire = buildAdminPaymentAlertHtml({
      kind: "wire",
      reference: "PCM-TEST02",
      amount: 200,
      currency: "USD",
      customerName: "Wayne",
      customerEmail: "wayne@example.com",
      detail: "Bank details requested",
    });
    expect(wire).toContain("Bank details requested");
  });
});

describe("method constants", () => {
  it("only allows card, crypto and wire", () => {
    const methods: PaymentMethod[] = ["card", "crypto", "wire"];
    expect(new Set(methods).size).toBe(3);
  });
});
