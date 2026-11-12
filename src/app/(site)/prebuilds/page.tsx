import type { Metadata } from "next";
import Link from "next/link";
import PrebuildsBrowser from "@/components/PrebuildsBrowser";
import RevealObserver from "@/components/RevealObserver";
import { prebuilds } from "@/data/prebuilds";

export const metadata: Metadata = {
  title: "Prebuilds | Pcmart",
};

const gridMask =
  "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

export default function PrebuildsPage() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <section className="relative overflow-hidden border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: gridMask,
            WebkitMaskImage: gridMask,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#5865F2]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 bg-[radial-gradient(circle_at_bottom_right,rgba(88,101,242,0.18),transparent_70%)]"
        />

        <div className="relative mx-auto flex min-h-[44vh] max-w-7xl flex-col px-4 py-6 sm:min-h-[60vh] sm:px-6 sm:py-8 lg:min-h-[72vh] lg:px-8 lg:py-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
          >
            <Link href="/" className="transition-colors hover:text-[#5865F2]">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#80848e]">
              /
            </span>
            <Link
              href="/prebuilds"
              aria-current="page"
              className="text-[#2e3338] transition-colors hover:text-[#5865F2]"
            >
              Prebuilds
            </Link>
          </nav>

          <div data-reveal="up" className="mt-10 max-w-2xl sm:mt-16">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
                Ready to ship
              </p>
            </div>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-balance text-[#2e3338] sm:text-6xl lg:text-7xl">
              PREBUILDS
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5c5e66] sm:text-lg">
              Power, out of the box. No guesswork, no compromises — just plug in
              and play.
            </p>
          </div>

          <p
            data-reveal="up"
            style={{ animationDelay: "120ms" }}
            className="mt-auto hidden max-w-md self-end pt-16 text-right text-sm leading-relaxed text-[#5c5e66] sm:block sm:text-base"
          >
            Pre-configured battle-stations. Designed &amp; Supported in
            world-wide, 24-hour burn-in tested — and shipped in 1–3 business
            days
          </p>
        </div>
      </section>

      <PrebuildsBrowser products={prebuilds} />
      <RevealObserver />
    </main>
  );
}
