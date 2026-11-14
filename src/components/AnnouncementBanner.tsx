"use client";

import Link from "next/link";

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

const headline =
  "Track your purchase — register your PC or laptop to get a purchase label number and a live tracking number.";

const cta = "Open your profile";

export default function AnnouncementBanner() {
  return (
    <Link
      href="/profile"
      aria-label={`${headline} ${cta}`}
      className="group relative block overflow-hidden border-b border-[#4752C4] bg-gradient-to-r from-[#5865F2] via-[#4a56e0] to-[#5865F2] transition-colors hover:from-[#4752C4] hover:via-[#5865F2] hover:to-[#4752C4]"
    >
      <div className="flex w-max animate-marquee-banner items-center py-2.5">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 items-center gap-3 pr-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
          >
            <span className="h-3 w-3 shrink-0 rounded-[2px] bg-white/70" />
            <span>{headline}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] tracking-[0.18em]">
              {cta}
              <ArrowIcon className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}
