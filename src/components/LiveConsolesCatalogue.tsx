"use client";

import { useEffect, useState } from "react";
import ConsolesCatalogue from "@/components/ConsolesCatalogue";
import {
  consoleCategories,
  consoles,
  featuredConsoleId,
  type Console,
} from "@/data/consoles";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

/** Uses D1 consoles when published, otherwise the hardcoded catalogue. */
export default function LiveConsolesCatalogue() {
  const [items, setItems] = useState<Console[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/consoles`);
        const payload = (await response.json()) as { items?: { data: Record<string, unknown> }[] };

        if (!cancelled && payload.items?.length) {
          setItems(
            payload.items.map(
              (item) => ({ ...item.data, id: String(item.data.id ?? "") }) as unknown as Console
            )
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
        <div className="mx-auto max-w-7xl px-4 text-sm text-[#5c5e66] sm:px-6 lg:px-8">Loading displays…</div>
      </section>
    );
  }

  const source: Console[] = items.length ? items : consoles;
  const featured = source.find((c) => c.id === featuredConsoleId) ?? source[0];

  if (!featured) {
    return (
      <section className="bg-[#f0f4fa] py-16">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[#5c5e66] sm:px-6 lg:px-8">
          No displays available yet.
        </div>
      </section>
    );
  }

  return (
    <ConsolesCatalogue
      categories={consoleCategories}
      products={source}
      featured={featured}
    />
  );
}
