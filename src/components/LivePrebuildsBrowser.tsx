"use client";

import { useEffect, useState } from "react";
import { resolveImageUrls, resolveImageUrl } from "@/lib/image-url";


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
        if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);

        const payload = (await response.json()) as { products?: Product[] };

        if (!cancelled) {
          setProducts(
            (payload.products ?? []).map((product) => ({
              ...product,
              images: resolveImageUrls(product.images),
              image: resolveImageUrl(product.image) ?? product.image,
            }))
          );
        }
      } catch {
        if (!cancelled) setProducts([]);
      }
    }

    void load();

    // Refetch whenever the tab regains focus so storefront pages stay in sync
    // with admin changes made in another tab.
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
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
