import type { Metadata } from "next";
import Link from "next/link";
import DirectEmailForm from "@/components/DirectEmailForm";
import RevealObserver from "@/components/RevealObserver";
import SupportAvailability from "@/components/SupportAvailability";
import SupportChannels from "@/components/SupportChannels";
import { supportStats } from "@/data/support";

export const metadata: Metadata = {
  title: "Support | Pcmart",
};

const gridMask =
  "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

export default function SupportPage() {
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
              href="/support"
              aria-current="page"
              className="text-[#2e3338] transition-colors hover:text-[#5865F2]"
            >
              Support
            </Link>
          </nav>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-12">
            <div data-reveal="up" className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
                  Support Center
                </p>
              </div>
              <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-balance text-[#2e3338] sm:text-6xl lg:text-7xl">
                SUPPORT
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5c5e66] sm:text-lg">
                Real technicians, real answers. Ask about an order, a build, a
                repair, or a warranty claim — we have been building and
                supporting PCs worldwide for over a decade.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {supportStats.map((stat) => (
                  <span
                    key={stat.label}
                    className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]"
                  >
                    {stat.value} {stat.label}
                  </span>
                ))}
              </div>
            </div>

            <div
              data-reveal="up"
              style={{ animationDelay: "120ms" }}
              className="rounded-2xl border border-[#d2dbe8] bg-[#eaf0f8] p-5 sm:p-6"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">
                Before you write
              </p>
              <p className="mt-2 text-lg font-bold leading-snug text-[#2e3338]">
                Have your order number ready.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
                Order numbers, the exact part, and a short description of the
                issue are enough for us to act on the first reply.
              </p>
              <ul className="mt-4 space-y-2 border-t border-[#d2dbe8] pt-4">
                {[
                  "Order number",
                  "Part or model name",
                  "What went wrong",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs font-medium text-[#4e5058]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5865F2]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div data-reveal="left" className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5865F2]">
                  Pick a channel
                </span>
              </div>
              <h2
                data-reveal="up"
                style={{ animationDelay: "80ms" }}
                className="mt-5 text-3xl font-bold tracking-tight text-balance text-[#2e3338] sm:text-4xl"
              >
                How can we help?
              </h2>
            </div>

            <p
              data-reveal="up"
              style={{ animationDelay: "160ms" }}
              className="max-w-md text-sm leading-relaxed text-[#5c5e66]"
            >
              Three ways to reach the same team. Whichever you pick, you are
              talking to the people who built and support your PC.
            </p>
          </div>

          <div className="mt-10">
            <SupportChannels />
          </div>
        </div>
      </section>

      <section className="bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div data-reveal="left" className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5865F2]">
                  Direct line
                </span>
              </div>
              <h2
                data-reveal="up"
                style={{ animationDelay: "80ms" }}
                className="mt-5 text-3xl font-bold tracking-tight text-balance text-[#2e3338] sm:text-4xl"
              >
                Write straight to the owners
              </h2>
            </div>

            <p
              data-reveal="up"
              style={{ animationDelay: "160ms" }}
              className="max-w-md text-sm leading-relaxed text-[#5c5e66]"
            >
              Skip the queue entirely. Send your message below and it lands
              with the people behind Pcmart.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div data-reveal="up">
              <DirectEmailForm />
            </div>
            <div data-reveal="up" style={{ animationDelay: "120ms" }}>
              <SupportAvailability />
            </div>
          </div>
        </div>
      </section>

      <RevealObserver />
    </main>
  );
}
