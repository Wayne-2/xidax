export type ErrorTone = "error" | "success" | "info";

export class AppError extends Error {
  status?: number;
  offline: boolean;
  code?: string;
  /** Optional structured body from the API (e.g. a failed checkout session). */
  payload?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      offline?: boolean;
      code?: string;
      payload?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.status = options.status;
    this.offline = options.offline ?? false;
    this.code = options.code;
    this.payload = options.payload;
  }
}

export function isOffline() {
  if (typeof navigator === "undefined") return false;

  return navigator.onLine === false;
}

/**
 * Turns anything that was thrown into a message we are happy to show a
 * shopper. Network failures, timeouts and unknown crashes all get a plain
 * sentence instead of a stack trace.
 */
export function friendlyError(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "That took too long. Please try again.";
    }

    if (
      error.message === "Failed to fetch" ||
      error.message === "NetworkError when attempting to fetch resource." ||
      error.message.includes("ERR_INTERNET_DISCONNECTED")
    ) {
      return "You appear to be offline. Check your connection and try again.";
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  return fallback;
}

export function isRetryable(error: unknown) {
  if (error instanceof AppError) {
    return error.offline || (error.status ?? 0) >= 500;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  return false;
}
