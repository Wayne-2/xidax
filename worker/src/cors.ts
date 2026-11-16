import type { Env } from "./types";

/**
 * Origins that are allowed to call the API.
 *
 * The production site is always allowed. Development origins can be added
 * through the ALLOWED_ORIGINS variable (comma separated).
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://genericpcs.com",
  "https://www.genericpcs.com",
];

const DEV_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function resolveAllowedOrigins(env: Env): string[] {
  const configured = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]));
}

export function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;

  if (resolveAllowedOrigins(env).includes(origin)) return true;

  // Local development is permitted so the OTP flow can be tested locally.
  return DEV_ORIGIN_PATTERN.test(origin);
}

/**
 * Builds the CORS headers for a request.
 *
 * Only the exact origin is echoed back, never "*", so that credentialed
 * requests stay safe.
 */
export function corsHeaders(
  request: Request,
  env: Env
): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = isOriginAllowed(origin, env);

  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };

  if (allowed && origin) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
}
