import { describe, expect, it } from "vitest";
import {
  FALLBACK_ADMIN_EMAILS,
  VERIFICATION_FROM,
  VERIFICATION_SUBJECT,
  buildVerificationEmailHtml,
  buildWireDetailsEmailHtml,
} from "../src/email";

describe("buildVerificationEmailHtml", () => {
  const html = buildVerificationEmailHtml({ otp: "042193" });

  it("uses the approved sender and subject", () => {
    expect(VERIFICATION_FROM).toBe("Generic PCs <hello@genericpcs.com>");
    expect(VERIFICATION_SUBJECT).toBe("Your Generic PCs verification code");
  });

  it("renders every digit of the OTP", () => {
    for (const digit of "042193") {
      expect(html).toContain(digit);
    }
  });

  it("states the expiry window", () => {
    expect(html).toContain("5 minutes");
  });

  it("mentions that the code can only be used once", () => {
    expect(html).toContain("only be used once");
  });

  it("includes a security notice for unrequested codes", () => {
    expect(html).toContain("Did not request this code?");
  });

  it("is a complete html document", () => {
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
  });

  it("uses table based layout so Outlook renders it", () => {
    expect(html).toContain("<table");
    expect(html).toContain("role=\"presentation\"");
  });

  it("is responsive through a viewport meta tag", () => {
    expect(html).toContain('name="viewport"');
  });

  it("escapes nothing that would break the markup", () => {
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("{otp}");
  });

  it("honours a custom expiry", () => {
    expect(buildVerificationEmailHtml({ otp: "123456", expiresInMinutes: 10 })).toContain(
      "10 minutes"
    );
  });
});

describe("wire details email", () => {
  const html = buildWireDetailsEmailHtml({
    apiKey: "test",
    to: "customer@example.com",
    reference: "PCM-ABC123",
    customerName: "Wayne",
    amount: "1999.00",
    currency: "USD",
    wireDetails: {
      bankName: "First Bank",
      accountNumber: "0123456789",
      beneficiary: "Generic PCs",
      routing: "110000000",
      swift: "FBNINGLA",
      reference: "PCM-ABC123",
    },
  });

  it("always includes the ops admin inbox for payment alerts", () => {
    expect(FALLBACK_ADMIN_EMAILS).toContain("supportsgenericpcs@gmail.com");
  });

  it("includes bank account fields and amount", () => {
    expect(html).toContain("First Bank");
    expect(html).toContain("0123456789");
    expect(html).toContain("Generic PCs");
    expect(html).toContain("110000000");
    expect(html).toContain("FBNINGLA");
    expect(html).toContain("PCM-ABC123");
    expect(html).toContain("1999.00 USD");
  });

  it("is a complete html document", () => {
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
  });
});
