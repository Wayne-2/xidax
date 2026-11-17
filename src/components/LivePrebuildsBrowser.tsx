"use client";

import { useEffect, useState } from "react";
import PrebuildsBrowser from "@/components/PrebuildsBrowser";
import type { Product } from "@/lib/admin-api";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

/** Fetches published products from D1 and renders the catalogue. */
export default function LivePrebuildsBrowser() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/products`);
        const payload = (await response.json()) as { products?: Product[] };

        if (!cancelled) {
          setProducts(payload.products ?? []);
        }
      } catch {
        if (!cancelled) setProducts([]);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // While loading, render nothing to avoid a flash of the old catalogue.
  if (products === null) {
    return (
      <section className="bg-[#f0f4fa] py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-[#5c5e66]">Loading builds…</p>
        </div>
      </section>
    );
  }

  return <PrebuildsBrowser products={products} />;
}
