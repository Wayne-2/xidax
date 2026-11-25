import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import InstallGuide from "@/components/InstallGuide";
import RevealObserver from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "Installation Guide | generic pcs",
};

export default function InstallGuidePage() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-12">
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
          <span aria-current="page" className="text-[#2e3338]">
            Installation Guide
          </span>
        </nav>

        <div className="mt-8">
          <Suspense fallback={null}>
            <InstallGuide />
          </Suspense>
        </div>
      </div>
      <RevealObserver />
    </main>
  );
}
