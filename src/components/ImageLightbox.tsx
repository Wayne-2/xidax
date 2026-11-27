"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Full-screen image viewer. Opened from a product card's image grid.
 * Supports next/previous buttons, arrow keys, Escape, thumbnails and a
 * click-outside close.
 */
export default function ImageLightbox({
  images,
  alt,
  initialIndex = 0,
  onClose,
}: {
  images: string[];
  alt: string;
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const total = images.length;

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % total);
  }, [total]);

  const previous = useCallback(() => {
    setIndex((current) => (current - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, next, previous]);

  if (total === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} image preview`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white sm:px-8">
        <p className="truncate text-sm font-semibold">{alt}</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-white/60">{index + 1} / {total}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl transition-colors hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-2 sm:px-16"
        onClick={(event) => event.stopPropagation()}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={previous}
            aria-label="Previous image"
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-2xl text-white transition-colors hover:bg-white/20 sm:left-4"
          >
            ‹
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${alt} — image ${index + 1} of ${total}`}
          className="max-h-[calc(100dvh-11rem)] max-w-full rounded-xl object-contain shadow-2xl sm:max-h-[calc(100dvh-12rem)]"
        />

        {total > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-2xl text-white transition-colors hover:bg-white/20 sm:right-4"
          >
            ›
          </button>
        )}
      </div>

      {total > 1 && (
        <div
          className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto px-4 pb-4"
          onClick={(event) => event.stopPropagation()}
        >
          {images.map((src, imageIndex) => (
            <button
              key={`${src}-${imageIndex}`}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`View image ${imageIndex + 1}`}
              aria-current={imageIndex === index}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                imageIndex === index
                  ? "border-[#5865F2]"
                  : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
