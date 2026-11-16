import { describe, expect, it } from "vitest";
import {
  VERIFICATION_FROM,
  VERIFICATION_SUBJECT,
  buildVerificationEmailHtml,
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
