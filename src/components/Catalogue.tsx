"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import CountUp from "@/components/CountUp";

const builds = [
  {
    title: "X-6 GeForce RTX 5070 + i7 14700F TENRAI",
    image: "/catalogue_image.png",
    rating: 4.8,
    reviews: 128,
    description:
      "Intel Core i7-14700F · GeForce RTX 5070 12GB · 32GB DDR5 · 1TB NVMe SSD",
    price: "$1,899.99",
    salePrice: "$1,649.99",
  },
  {
    title: "Xidax Legendary AMD",
    image: "/catalogue_image2.png",
    rating: 4.9,
    reviews: 96,
    description:
      "AMD Ryzen 7 9800X3D · Radeon RX 9070 XT 16GB · 32GB DDR5 · 2TB NVMe SSD",
    price: "$2,299.99",
    salePrice: "$1,999.99",
  },
];

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronLeftIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${filled ? "text-[#35CE00]" : "text-white/20"}`}
      aria-hidden="true"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
    </svg>
  );
}

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} filled={star <= Math.round(rating)} />
        ))}
      </div>
      <span className="text-xs text-white/50">
        {rating.toFixed(1)} ({reviews})
      </span>
    </div>
  );
}

export default function Catalogue() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <section className="text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div data-reveal="left" className="flex items-center gap-3">
          <span
            className="h-px w-[50px] bg-gradient-to-r from-[#35CE00] to-transparent"
            aria-hidden="true"
          />
          <span className="text-base font-medium uppercase tracking-[0.2em] text-white/70">
            Featured Build
          </span>
        </div>

        <h2
          data-reveal="up"
          style={{ animationDelay: "80ms" }}
          className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
        >
          Five featured builds. One ironclad standard.
        </h2>

        <div
          data-reveal="up"
          style={{ animationDelay: "160ms" }}
          className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <p className="max-w-2xl text-base leading-relaxed text-white/60">
            Every build runs through 24 Hour Quality Control Testing before it
            ships. Every build wears the same lifetime service &amp; labor.
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              View all prebuilds
              <ArrowIcon />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Previous"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Next"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {builds.map((build, index) => (
            <article
              key={build.title}
              data-card
              data-reveal="blur"
              style={{ animationDelay: `${index * 120}ms` }}
              className="group flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 transition-colors hover:border-[#35CE00]/60 sm:w-[47%] lg:w-[31.5%]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-800">
                <Image
                  src={build.image}
                  alt={build.title}
                  fill
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 47vw, 85vw"
                  quality={90}
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-md bg-[#35CE00] px-2 py-1 text-xs font-bold uppercase tracking-wide text-neutral-950">
                  Sale
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                <StarRating rating={build.rating} reviews={build.reviews} />

                <h3 className="text-base font-semibold leading-snug text-white">
                  {build.title}
                </h3>

                <p className="text-sm leading-relaxed text-white/50">
                  {build.description}
                </p>

                <div className="mt-auto flex items-end gap-2 pt-1">
                  <span className="text-lg font-bold text-[#35CE00]">
                    {build.salePrice}
                  </span>
                  <span className="pb-0.5 text-sm text-white/40 line-through">
                    {build.price}
                  </span>
                </div>

                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[#35CE00] px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-[#43e00d]"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
                  >
                    Customize
                  </button>
                </div>
              </div>
            </article>
          ))}

          <Link
            href="/prebuilds"
            data-card
            data-reveal="blur"
            style={{ animationDelay: "240ms" }}
            className="group relative flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 p-6 transition-colors hover:border-[#35CE00]/60 sm:w-[47%] lg:w-[31.5%]"
          >
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative flex flex-1 flex-col">
              <div className="flex justify-center py-6">
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-full border border-[#35CE00]/50 text-[#35CE00] transition-transform duration-300 ease-out group-hover:-rotate-12"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(53,206,0,0) 40%, rgba(53,206,0,0.1) 100%)",
                  }}
                >
                  <ArrowIcon className="h-10 w-10" />
                </span>
              </div>

              <span className="text-xs font-semibold uppercase tracking-wide text-[#35CE00]">
                Full Catalogue
              </span>

              <h3 className="mt-4 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                See all builds
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Every configuration. Every tier. Lifetime Service &amp; Labor on
                all of them.
              </p>

              <div className="mt-auto flex items-center gap-6 pt-8">
                <div>
                  <p className="text-2xl font-bold text-white">
                    <CountUp value={120} suffix="+" />
                  </p>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Configs
                  </p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    <CountUp value={50} suffix="K+" />
                  </p>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Labors
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
