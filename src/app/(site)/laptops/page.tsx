import type { Metadata } from "next";
import Link from "next/link";
import LaptopCatalogue from "@/components/LaptopCatalogue";
import RevealObserver from "@/components/RevealObserver";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import {
  featuredLaptopId,
  laptopCategories,
  laptops,
} from "@/data/laptops";

export const metadata: Metadata = {
  title: "Laptops | Pcmart",
};

const gridMask =
  "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

export default function LaptopsPage() {
  const featured = laptops.find((laptop) => laptop.id === featuredLaptopId) ?? laptops[0];

  return (
    <main className="relative flex-1">
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

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
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
              href="/laptops"
              aria-current="page"
              className="text-[#2e3338] transition-colors hover:text-[#5865F2]"
            >
              Laptops
            </Link>
          </nav>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-12">
            <div data-reveal="up" className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
                  Ready to ship
                </p>
              </div>
              <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-balance text-[#2e3338] sm:text-6xl lg:text-7xl">
                LAPTOPS
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5c5e66] sm:text-lg">
                Desktop-class performance that fits in a bag. Gaming, creator,
                and everyday machines — built, burned in, and shipped worldwide.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]">
                  {laptops.length} laptops
                </span>
                <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]">
                  {laptopCategories.length} categories
                </span>
                <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]">
                  Free shipping over $99
                </span>
              </div>
            </div>

            <div
              data-reveal="up"
              style={{ animationDelay: "120ms" }}
              className="rounded-2xl border border-[#d2dbe8] bg-[#eaf0f8] p-5 sm:p-6"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">
                Every laptop ships with
              </p>
              <p className="mt-2 text-lg font-bold leading-snug text-[#2e3338]">
                Burned in for 24 hours before it leaves us.
              </p>
              <p className="mt-2 hidden text-sm leading-relaxed text-[#5c5e66] sm:block">
                Same standards as our desktops, tuned for a chassis that moves.
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#d2dbe8] pt-4">
                {[
                  "24-hour burn-in test",
                  "3-year warranty",
                  "Lifetime support",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs font-medium text-[#4e5058]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5865F2]/10 text-[#5865F2]">
                      <CheckIcon className="h-2.5 w-2.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <LaptopCatalogue
        categories={laptopCategories}
        laptops={laptops}
        featured={featured}
      />

      <section className="bg-[#eaf0f8]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div
            data-reveal="up"
            className="flex flex-col gap-6 rounded-2xl border border-[#d2dbe8] bg-[#f8fafe] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">
                Need more power?
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#2e3338] sm:text-3xl">
                Build a desktop that never moves.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
                Start from a ready-to-ship prebuild, or pick every component
                yourself.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/custom-builds"
                className="shimmer inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
              >
                Build your PC
                <ArrowIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/prebuilds"
                className="shimmer inline-flex h-11 items-center justify-center rounded-lg border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-medium text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
              >
                Shop prebuilds
              </Link>
            </div>
          </div>
        </div>
      </section>

      <RevealObserver />
    </main>
  );
}
