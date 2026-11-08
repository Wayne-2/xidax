import Image from "next/image";
import Link from "next/link";
import Catalogue from "@/components/Catalogue";
import Community from "@/components/Community";
import DisplayCards from "@/components/DisplayCards";
import Parallax from "@/components/Parallax";
import RevealObserver from "@/components/RevealObserver";
import ThePromise from "@/components/ThePromise";
import TrustedBy from "@/components/TrustedBy";
import WhatSetsApart from "@/components/WhatSetsApart";

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

export default function Home() {
  return (
    <>
      <main className="relative flex-1 overflow-hidden text-white">
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-28">
          <div>
            <h1
              data-reveal="up"
              className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              Gaming PCs built to{" "}
              <span className="text-[#35CE00]">dominate.</span>
            </h1>

            <p
              data-reveal="up"
              style={{ animationDelay: "120ms" }}
              className="mt-5 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg"
            >
              Hand-built, stress-tested, and tuned for maximum FPS. Pick a
              ready-to-ship prebuild or configure your dream machine — no
              compromises.
            </p>

            <div
              data-reveal="up"
              style={{ animationDelay: "240ms" }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/prebuilds"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#35CE00] px-7 text-sm font-semibold text-neutral-950 shadow-lg shadow-[#35CE00]/25 transition-colors hover:bg-[#43e00d]"
              >
                Shop prebuilds
                <ArrowIcon />
              </Link>
              <Link
                href="/custom-builds"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Build your own
              </Link>
            </div>
          </div>

          <div
            data-reveal="scale"
            style={{ animationDelay: "180ms" }}
            className="relative mx-auto w-full max-w-[20rem] sm:max-w-[24rem] lg:max-w-[26rem]"
          >
            <Parallax speed={0.06}>
              <Image
                src="/hero_image.png"
                alt="XIDAX custom gaming PC"
                width={900}
                height={900}
                priority
                quality={90}
                sizes="(min-width: 1024px) 416px, (min-width: 640px) 384px, 100vw"
                className="h-auto w-full rounded-3xl object-contain"
              />
            </Parallax>
          </div>
        </div>
      </main>
      <DisplayCards />
      <Catalogue />
      <WhatSetsApart />
      <ThePromise />
      <Community />
      <TrustedBy />
      <RevealObserver />
    </>
  );
}
