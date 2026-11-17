import type { Env } from "./types";

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfter: number };

/**
 * Sliding-window rate limiter backed by Cloudflare KV.
 *
 * KV is eventually consistent and read-modify-write is not atomic, so this is
 * suitable for abuse throttling (not strict billing). Keys expire via TTL so
 * no cleanup job is needed.
 */
export async function rateLimit(
  env: Env,
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `ratelimit:${scope}:${identifier}:${bucket}`;

  try {
    const raw = await env.SESSIONS.get(key, "text");
    const count = raw ? Number.parseInt(raw, 10) || 0 : 0;

    if (count >= limit) {
      const retryAfter =
        (bucket + 1) * windowSeconds * 1000 - Date.now();
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil(retryAfter / 1000)),
      };
    }

    await env.SESSIONS.put(key, String(count + 1), {
      expirationTtl: windowSeconds * 2,
    });

    return { allowed: true, remaining: Math.max(0, limit - count - 1) };
  } catch (error) {
    // If KV is unavailable, fail open for availability. Security-critical
    // limits (OTP) are additionally enforced in D1.
    console.error("rate-limit failure:", error);
    return { allowed: true, remaining: limit };
  }
}

/** Extracts a stable client IP from Cloudflare-provided headers. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
