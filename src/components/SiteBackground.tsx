"use client";

import { useEffect, useRef } from "react";

const gridMask = [
  "radial-gradient(circle at 12% 18%, black 0 150px, transparent 210px)",
  "radial-gradient(circle at 86% 12%, black 0 110px, transparent 170px)",
  "radial-gradient(circle at 76% 66%, black 0 180px, transparent 250px)",
  "radial-gradient(circle at 22% 82%, black 0 130px, transparent 190px)",
  "radial-gradient(circle at 52% 38%, black 0 90px, transparent 150px)",
  "radial-gradient(circle at 40% 60%, black 0 70px, transparent 120px)",
].join(", ");

export default function SiteBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const spotlight = spotlightRef.current;
    if (!root || !spotlight) return;

    let frame = 0;
    const handleMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = root.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

        spotlight.style.setProperty("--mx", `${x}px`);
        spotlight.style.setProperty("--my", `${y}px`);
        spotlight.style.opacity = inside ? "0.6" : "0";
      });
    };

    window.addEventListener("pointermove", handleMove);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: gridMask,
          WebkitMaskImage: gridMask,
        }}
      />

      <div
        ref={spotlightRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(0,0,0,0.06) 0%, rgba(0,0,0,0) 70%), linear-gradient(to right, rgba(0,0,0,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.35) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 64px 64px, 64px 64px",
          maskImage:
            "radial-gradient(circle 240px at var(--mx, 50%) var(--my, 50%), black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(circle 240px at var(--mx, 50%) var(--my, 50%), black 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
