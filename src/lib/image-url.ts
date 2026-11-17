const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

/**
 * Normalises product image URLs. Uploads are stored on the API worker (R2),
 * so relative /api/images/... paths must resolve against the API origin,
 * not the storefront origin.
 */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  if (url.startsWith("/api/images/")) return `${API_BASE}${url}`;

  return url;
}

export function resolveImageUrls(urls?: (string | null)[] | null): string[] {
  return (urls ?? [])
    .map((url) => resolveImageUrl(url))
    .filter((url): url is string => Boolean(url));
}
