"use client";

import { useEffect, useState } from "react";
import LaptopCatalogue from "@/components/LaptopCatalogue";
import { laptopCategories, laptops, featuredLaptopId, type Laptop } from "@/data/laptops";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

/** Uses D1 laptops when published, otherwise the hardcoded catalogue. */
export default function LiveLaptopCatalogue() {
  const [items, setItems] = useState<Laptop[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/laptops`);
        const payload = (await response.json()) as { items?: { data: Record<string, unknown> }[] };

        if (!cancelled && payload.items?.length) {
          setItems(
            payload.items.map((item) => ({ ...item.data, id: String(item.data.id ?? "") }) as unknown as Laptop)
          );
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    void load();

    return () => { cancelled = true; };
  }, []);

  if (items === null) {
    return (
      <section className="bg-[#f0f4fa] py-10">
        <div className="mx-auto max-w-7xl px-4 text-sm text-[#5c5e66] sm:px-6 lg:px-8">Loading laptops…</div>
      </section>
    );
  }

  const source: Laptop[] = items.length ? items : laptops;
  const featured = source.find((l) => l.id === featuredLaptopId) ?? source[0];

  if (!featured) {
    return (
      <section className="bg-[#f0f4fa] py-16">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[#5c5e66] sm:px-6 lg:px-8">
          No laptops available yet.
        </div>
      </section>
    );
  }

  return (
    <LaptopCatalogue categories={laptopCategories} laptops={source} featured={featured} />
  );
}
