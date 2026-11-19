"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

/**
 * Product gallery for detail pages. The first image is the hero; the rest
 * tile in a responsive grid. Every image opens the full-screen viewer.
 */
export default function ProductGallery({
  images,
  name,
  accent = "#5865F2",
}: {
  images: string[];
  name: string;
  accent?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div
        className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-[#dce3ee]"
        style={{ background: `linear-gradient(135deg, ${accent}18, #dce3ee)` }}
      >
        <span className="text-sm text-[#80848e]">No images available</span>
      </div>
    );
  }

  const [hero, ...rest] = images;

  return (
    <>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          aria-label={`Preview ${name} — image 1`}
          className="relative block aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-[#dce3ee]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </button>

        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {rest.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => setOpenIndex(index + 1)}
                aria-label={`Preview ${name} — image ${index + 2}`}
                className="relative aspect-[4/3] overflow-hidden bg-[#dce3ee] last:rounded-b-2xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-[#80848e]">
        {images.length} image{images.length === 1 ? "" : "s"} · tap any image for a full preview
      </p>

      {openIndex !== null && (
        <ImageLightbox
          images={images}
          alt={name}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
