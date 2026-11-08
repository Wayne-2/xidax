"use client";

import { addCollection, Icon } from "@iconify/react";
import collections from "./brandIcons.json";

const iconCollections = collections as unknown as Parameters<
  typeof addCollection
>[0][];
iconCollections.forEach((collection) => addCollection(collection));

const partners = [
  { name: "Google", icon: "logos:google" },
  { name: "AMD", icon: "logos:amd" },
  { name: "NVIDIA", icon: "logos:nvidia" },
  { name: "Apple", icon: "logos:apple" },
  { name: "Microsoft", icon: "logos:microsoft" },
  { name: "Intel", icon: "logos:intel" },
  { name: "Amazon", icon: "simple-icons:amazon" },
];

function LogoRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-14 pr-14"
      aria-hidden={hidden || undefined}
    >
      {partners.map((partner) => (
        <span
          key={partner.name}
          title={partner.name}
          className="flex items-center justify-center opacity-60 transition-opacity duration-300 hover:opacity-100"
        >
          <Icon
            icon={partner.icon}
            height={32}
            ssr
            className="h-8 w-auto brightness-0 invert"
          />
        </span>
      ))}
    </div>
  );
}

export default function TrustedBy() {
  return (
    <section className="border-b-2 border-[#35CE00] bg-[#030603] text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
        <h2
          data-reveal="up"
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Trusted By
        </h2>
        <p
          data-reveal="up"
          style={{ animationDelay: "100ms" }}
          className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/60"
        >
          Trusted by the companies and creators the world watches.
        </p>

        <div
          data-reveal="fade"
          style={{ animationDelay: "200ms" }}
          className="relative mt-12 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#030603] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#030603] to-transparent" />

          <div className="flex w-max animate-marquee">
            <LogoRow />
            <LogoRow hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
