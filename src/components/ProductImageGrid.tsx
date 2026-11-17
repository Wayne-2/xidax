"use client";

import { useState, type ReactNode } from "react";
import ImageLightbox from "@/components/ImageLightbox";

/**
 * Product media layout used by every product card.
 *
 * One large image on the left and two stacked images on the right. Tapping a
 * tile opens a full-screen viewer with next/previous navigation. When an image
 * is missing, the supplied artwork fallback is rendered in that tile so cards
 * never show empty boxes.
 */
export default function ProductImageGrid({
  images,
  alt,
  fallback,
  className = "",
  aspect = "aspect-[4/3]",
  interactive = true,
}: {
  images?: string[];
  alt: string;
  fallback?: ReactNode;
  className?: string;
  aspect?: string;
  interactive?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // De-duplicate so the viewer never cycles through repeated placeholder tiles.
  const unique = Array.from(new Set((images ?? []).filter(Boolean)));
  const tiles = [images?.[0], images?.[1] ?? images?.[0], images?.[2] ?? images?.[0]];

  return (
    <>
      <div className={`grid h-full w-full grid-cols-[1.7fr_1fr] gap-1 ${className}`}>
        <div className={`relative h-full overflow-hidden bg-[#dce3ee] ${aspect}`}>
          <Tile
            src={tiles[0]}
            alt={alt}
            fallback={fallback}
            onOpen={interactive ? () => setOpenIndex(0) : undefined}
          />
        </div>
        <div className="grid grid-rows-2 gap-1">
          <div className="relative h-full overflow-hidden bg-[#dce3ee]">
            <Tile
              src={tiles[1]}
              alt={alt}
              fallback={fallback}
              onOpen={interactive ? () => setOpenIndex(Math.min(1, unique.length - 1)) : undefined}
            />
          </div>
          <div className="relative h-full overflow-hidden bg-[#dce3ee]">
            <Tile
              src={tiles[2]}
              alt={alt}
              fallback={fallback}
              onOpen={interactive ? () => setOpenIndex(Math.min(2, unique.length - 1)) : undefined}
            />
          </div>
        </div>
      </div>

      {openIndex !== null && unique.length > 0 && (
        <ImageLightbox
          images={unique}
          alt={alt}
          initialIndex={Math.min(openIndex, unique.length - 1)}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

function Tile({
  src,
  alt,
  fallback,
  onOpen,
}: {
  src?: string;
  alt: string;
  fallback?: ReactNode;
  onOpen?: () => void;
}) {
  if (src) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${alt}`}
        className="absolute inset-0 h-full w-full cursor-zoom-in"
        tabIndex={onOpen ? 0 : -1}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-2">
      {fallback ?? (
        <div className="h-full w-full bg-gradient-to-br from-[#e4e9f0] to-[#d2dbe8]" />
      )}
    </div>
  );
}
