"use client";

import { useEffect, useState } from "react";
import { resolveImageUrls, resolveImageUrl } from "@/lib/image-url";


import LaptopCatalogue from "@/components/LaptopCatalogue";
import CatalogEmptyState from "@/components/CatalogEmptyState";
import { laptopCategories, featuredLaptopId, type Laptop } from "@/data/laptops";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

/** Uses published D1 laptops; shows an empty state until admin adds products. */
export default function LiveLaptopCatalogue() {
  const [items, setItems] = useState<Laptop[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/laptops`);
        if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);

        const payload = (await response.json()) as { items?: { data: Record<string, unknown> }[] };

        if (!cancelled && payload.items?.length) {
          setItems(
            payload.items.map((item) => {
              const data = item.data;
              const images = Array.isArray(data.images)
                ? resolveImageUrls(data.images as string[])
                : [];
              return {
                ...data,
                id: String(data.id ?? ""),
                images: images.length ? images : undefined,
                image: images[0] ?? (typeof data.image === "string" ? resolveImageUrl(data.image) : undefined),
              } as unknown as Laptop;
            })
          );
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    void load();

    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (items === null) {
    return (
      <section className="bg-[#f0f4fa] py-10">
        <div className="mx-auto max-w-7xl px-4 text-sm text-[#5c5e66] sm:px-6 lg:px-8">Loading laptops…</div>
      </section>
    );
  }

  const source: Laptop[] = items;
  const featured = source.find((l) => l.id === featuredLaptopId) ?? source[0];

  if (!featured) {
    return <CatalogEmptyState category="laptop" />;
  }

  return (
    <LaptopCatalogue categories={laptopCategories} laptops={source} featured={featured} />
  );
}
