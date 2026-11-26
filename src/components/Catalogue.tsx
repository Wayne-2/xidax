"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PrebuildCard from "@/components/PrebuildCard";
import { resolveImageUrl, resolveImageUrls } from "@/lib/image-url";
import type { Prebuild } from "@/data/prebuilds";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>;
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;
}

export default function Catalogue() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [builds, setBuilds] = useState<Prebuild[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) return;
        const payload = (await res.json()) as { products?: Array<Record<string, unknown>> };
        if (cancelled) return;
        const mapped = (payload.products ?? []).slice(0, 2).map((p) => ({
          id: String(p.id ?? ""),
          name: String(p.name ?? ""),
          image: resolveImageUrl(typeof p.image === "string" ? p.image : undefined) ?? (typeof p.image === "string" ? p.image : ""),
          images: resolveImageUrls(Array.isArray(p.images) ? p.images as string[] : []),
          brand: (p.brand === "amd" ? "amd" : "intel") as Prebuild["brand"],
          price: Number(p.price ?? 0),
          originalPrice: Number(p.originalPrice ?? 0),
          stock: (p.stock === "built-to-order" ? "built-to-order" : "in-stock") as Prebuild["stock"],
          flagship: Boolean(p.flagship),
          specs: String(p.specs ?? ""),
          promoCode: typeof p.promoCode === "string" ? p.promoCode : null,
          promoDiscount: typeof p.promoDiscount === "number" ? p.promoDiscount : 0,
          promoEnabled: Boolean(p.promoEnabled),
        }));
        setBuilds(mapped);
      } catch {}
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const scrollCarousel = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <section className="text-[#2e3338]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div data-reveal="left" className="flex items-center gap-3">
          <span className="h-px w-[50px] bg-gradient-to-r from-[#5865F2] to-transparent" aria-hidden="true" />
          <span className="text-base font-medium uppercase tracking-[0.2em] text-[#5c5e66]">Featured Build</span>
        </div>

        <h2 data-reveal="up" style={{ animationDelay: "80ms" }} className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          Featured builds. One ironclad standard.
        </h2>

        <div data-reveal="up" style={{ animationDelay: "160ms" }} className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl text-base leading-relaxed text-[#5c5e66]">
            Every build runs through 24 Hour Quality Control Testing before it ships. Every build wears the same lifetime service &amp; labor.
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/prebuilds" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d2dbe8] px-5 text-sm font-medium text-[#5c5e66] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]">
              View all prebuilds
              <ArrowIcon />
            </Link>
            <button type="button" onClick={() => scrollCarousel(-1)} aria-label="Previous" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d2dbe8] text-[#5c5e66] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]">
              <ChevronLeftIcon />
            </button>
            <button type="button" onClick={() => scrollCarousel(1)} aria-label="Next" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d2dbe8] text-[#5c5e66] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]">
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {builds.map((build, index) => (
            <div key={build.id} data-card data-reveal="blur" style={{ animationDelay: `${index * 120}ms` }} className="w-[85%] shrink-0 snap-start sm:w-[47%] lg:w-[31.5%]">
              <PrebuildCard product={build} />
            </div>
          ))}

          <Link href="/prebuilds" data-card data-reveal="blur" style={{ animationDelay: "240ms" }} className="group relative flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-6 shadow-card transition-colors hover:border-[#5865F2]/60 sm:w-[47%] lg:w-[31.5%] hover:shadow-card-hover">
            <div className="absolute inset-0" aria-hidden="true" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="relative flex flex-1 flex-col justify-center">
              <div>
                <h3 className="text-xl font-semibold leading-snug text-[#2e3338]">Explore more prebuilt gaming PCs</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">The right build, built right. Every time.</p>
              </div>
              <div className="flex items-center justify-center py-8">
                <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[#5865F2]/50 text-[#5865F2] transition-transform duration-300 ease-out group-hover:-rotate-12">
                  <ArrowIcon className="h-8 w-8" />
                </span>
              </div>
              <span className="inline-flex h-11 items-center justify-center rounded-lg bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors group-hover:bg-[#4752C4]">View all prebuilds</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
