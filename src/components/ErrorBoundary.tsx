"use client";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { friendlyError } from "@/lib/errors";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Shown instead of the default panel when something breaks. */
  label?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    const message = friendlyError(
      error,
      "Something broke on our side. Try again, and if it keeps happening we will fix it."
    );

    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B91C1C]">
          {this.props.label ?? "Something went wrong"}
        </p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2e3338]">
          We could not load this page
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">{message}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
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
      </div>
    );
  }
}
