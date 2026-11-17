import { describe, expect, it } from "vitest";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MS,
  generateSixDigitOTP,
  hashOTP,
  safeCompare,
  randomToken,
} from "../src/auth";

describe("generateSixDigitOTP", () => {
  it("always returns exactly six digits", () => {
    for (let index = 0; index < 1000; index += 1) {
      expect(generateSixDigitOTP()).toMatch(/^\d{6}$/);
    }
  });

  it("preserves leading zeros", () => {
    // With 1000 samples of six uniform digits, a leading zero must appear.
    const samples = Array.from({ length: 1000 }, () => generateSixDigitOTP());
    expect(samples.some((code) => code.startsWith("0"))).toBe(true);
  });

  it("does not rely on Math.random", () => {
    const source = generateSixDigitOTP.toString();
    expect(source).not.toContain("Math.random");
  });

  it("produces different values across calls", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateSixDigitOTP()));
    expect(codes.size).toBeGreaterThan(450);
  });
});

describe("hashOTP", () => {
  const pepper = "a-very-secret-pepper-value";

  it("produces a stable hash for the same input", async () => {
    const a = await hashOTP("123456", pepper);
    const b = await hashOTP("123456", pepper);
    expect(a).toBe(b);
  });

  it("produces different hashes for different OTPs", async () => {
    const a = await hashOTP("123456", pepper);
    const b = await hashOTP("654321", pepper);
    expect(a).not.toBe(b);
  });

  it("produces different hashes when the pepper changes", async () => {
    const a = await hashOTP("123456", pepper);
    const b = await hashOTP("123456", "another-pepper");
    expect(a).not.toBe(b);
  });

  it("never contains the plaintext OTP", async () => {
    const hash = await hashOTP("123456", pepper);
    expect(hash).not.toContain("123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("safeCompare", () => {
  it("returns true for identical strings", () => {
    expect(safeCompare("abcdef", "abcdef")).toBe(true);
  });

  it("returns false for different strings of equal length", () => {
    expect(safeCompare("abcdef", "abcdeg")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(safeCompare("abcdef", "abcde")).toBe(false);
  });
});

describe("OTP policy constants", () => {
  it("expires after five minutes", () => {
    expect(OTP_TTL_MS).toBe(5 * 60 * 1000);
  });

  it("allows five attempts", () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });

  it("enforces a sixty second resend cooldown", () => {
    expect(OTP_RESEND_COOLDOWN_SECONDS).toBe(60);
  });
});

describe("randomToken", () => {
  it('returns exactly 2 characters per requested byte with no undefined suffix', () => {
    for (const length of [1, 16, 32]) {
      const token = randomToken(length);
      expect(token).toHaveLength(length * 2);
      expect(token).not.toContain("undefined");
      expect(token).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("produces unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => randomToken(32)));
    expect(tokens.size).toBe(100);
  });
});
