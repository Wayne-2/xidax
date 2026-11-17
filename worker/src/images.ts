import type { Env } from "./types";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function extensionFor(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (CONTENT_TYPES[fromName]) return fromName;

  const fromMime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  return fromMime[mime] ?? "bin";
}

/** Stores an uploaded image in R2 and returns its public path. */
export async function uploadImage(
  env: Env,
  file: File
): Promise<
  | { ok: true; url: string; key: string }
  | { ok: false; status: number; error: string }
> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, status: 400, error: "No image file provided." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: "Images must be 10 MB or smaller." };
  }

  const contentType = file.type || "application/octet-stream";

  if (!contentType.startsWith("image/")) {
    return { ok: false, status: 415, error: "Only image files are allowed." };
  }

  const extension = extensionFor(file.name, contentType);

  if (!CONTENT_TYPES[extension]) {
    return { ok: false, status: 415, error: "Unsupported image format." };
  }

  const key = `products/${crypto.randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();

  await env.MEDIA.put(key, bytes, {
    httpMetadata: {
      contentType: CONTENT_TYPES[extension],
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return { ok: true, key, url: `/api/images/${key}` };
}

/** Streams an image from R2 with appropriate cache headers. */
export async function serveImage(
  env: Env,
  key: string
): Promise<Response | null> {
  const object = await env.MEDIA.get(key);

  if (!object) return null;

  const headers = new Headers();

  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, {
    status: 200,
    headers,
  });
}

/** Removes an image from R2 (best effort when a product is deleted). */
export async function deleteImage(env: Env, url: string): Promise<void> {
  const prefix = "/api/images/";

  if (!url.startsWith(prefix)) return;

  const key = url.slice(prefix.length);

  try {
    await env.MEDIA.delete(key);
  } catch {
    // Deleting the product must not fail because cleanup failed.
  }
}
