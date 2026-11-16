import { describe, expect, it } from "vitest";
import { corsHeaders, isOriginAllowed, resolveAllowedOrigins } from "../src/cors";
import type { Env } from "../src/types";

const env = { ALLOWED_ORIGINS: "" } as Env;

function requestWithOrigin(origin: string | null) {
  return new Request("https://api.genericpcs.com/api/auth/send-otp", {
    headers: origin ? { origin } : {},
  });
}

describe("resolveAllowedOrigins", () => {
  it("always includes the production site", () => {
    expect(resolveAllowedOrigins(env)).toContain("https://genericpcs.com");
    expect(resolveAllowedOrigins(env)).toContain("https://www.genericpcs.com");
  });

  it("includes extra origins from configuration", () => {
    const configured = {
      ALLOWED_ORIGINS: "https://staging.genericpcs.com, https://ops.internal",
    } as Env;

    const origins = resolveAllowedOrigins(configured);

    expect(origins).toContain("https://staging.genericpcs.com");
    expect(origins).toContain("https://ops.internal");
  });

  it("does not duplicate the production site", () => {
    const configured = {
      ALLOWED_ORIGINS: "https://genericpcs.com",
    } as Env;

    const origins = resolveAllowedOrigins(configured);

    expect(origins.filter((o) => o === "https://genericpcs.com")).toHaveLength(1);
  });
});

describe("isOriginAllowed", () => {
  it("rejects a missing origin", () => {
    expect(isOriginAllowed(null, env)).toBe(false);
  });

  it("allows the production site", () => {
    expect(isOriginAllowed("https://genericpcs.com", env)).toBe(true);
  });

  it("allows localhost for development", () => {
    expect(isOriginAllowed("http://localhost:3000", env)).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:8787", env)).toBe(true);
  });

  it("rejects a lookalike host", () => {
    expect(isOriginAllowed("https://genericpcs.com.evil.test", env)).toBe(false);
    expect(isOriginAllowed("https://evil.test", env)).toBe(false);
  });

  it("rejects a non http localhost scheme", () => {
    expect(isOriginAllowed("https://localhost:3000", env)).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("echoes an allowed origin", () => {
    const headers = corsHeaders(requestWithOrigin("https://genericpcs.com"), env);
    expect(headers["access-control-allow-origin"]).toBe("https://genericpcs.com");
  });

  it("never returns a wildcard", () => {
    const headers = corsHeaders(requestWithOrigin("https://evil.test"), env);
    expect(headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows the required methods and headers", () => {
    const headers = corsHeaders(requestWithOrigin("https://genericpcs.com"), env);
    expect(headers["access-control-allow-methods"]).toContain("POST");
    expect(headers["access-control-allow-headers"]).toContain("authorization");
  });

  it("varies on Origin so caches stay correct", () => {
    const headers = corsHeaders(requestWithOrigin("https://genericpcs.com"), env);
    expect(headers.vary).toBe("Origin");
  });
});
