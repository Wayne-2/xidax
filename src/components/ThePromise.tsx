import Image from "next/image";
import Link from "next/link";
import Parallax from "@/components/Parallax";

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function ThePromise() {
  return (
    <section className="border-t border-white/10 bg-[#030603] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <div data-reveal="left" className="flex items-center gap-3">
            <span
              className="h-px w-[50px] bg-gradient-to-r from-[#35CE00] to-transparent"
              aria-hidden="true"
            />
            <span className="text-base font-medium uppercase tracking-[0.2em] text-white/70">
              The Promise
            </span>
          </div>

          <h2
            data-reveal="up"
            style={{ animationDelay: "80ms" }}
            className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            Lifetime <span className="text-[#35CE00]">Service</span> &amp;{" "}
            <span className="text-[#35CE00]">Labor</span>
          </h2>

          <p
            data-reveal="up"
            style={{ animationDelay: "160ms" }}
            className="mt-4 max-w-xl text-base leading-relaxed text-white/60"
          >
            Every Xidax desktop is covered by lifetime service and labor — for
            as long as you own the machine. Parts get cheaper to replace. Labor
            never does. Our competitors think we&apos;re crazy for offering
            this. We think they&apos;re crazy for not.
          </p>

          <blockquote
            data-reveal="up"
            style={{ animationDelay: "240ms" }}
            className="mt-8 border-l-2 border-[#35CE00] pl-5 text-lg leading-relaxed text-white/80"
          >
            &quot;Bold enough to offer this level of coverage because we stand
            behind every rig as if it were our own.&quot;
          </blockquote>

          <Link
            href="/support"
            data-reveal="up"
            style={{ animationDelay: "320ms" }}
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#35CE00] px-7 text-sm font-semibold uppercase tracking-wide text-neutral-950 transition-colors hover:bg-[#43e00d]"
          >
            Read the full warranty
            <ArrowIcon />
          </Link>
        </div>

        <div
          data-reveal="scale"
          style={{ animationDelay: "180ms" }}
          className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-neutral-900"
        >
          <Parallax speed={0.05} className="absolute -inset-y-12 inset-x-0">
            <Image
              src="/terms_image.png"
              alt="Xidax lifetime service and labor"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={90}
              className="object-cover"
            />
          </Parallax>
        </div>
      </div>
    </section>
  );
}
