"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B91C1C]">
        Something went wrong
      </p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#2e3338]">
        We hit a snag
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">
        The page could not finish loading. Try again — if it keeps happening,
        our team has been notified and will pick it up.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
        >
          Back to the store
        </Link>
        <Link
          href="/support"
          className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
        >
          Contact support
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-[#80848e]">
          Reference {error.digest}
        </p>
      )}
    </div>
  );
}
