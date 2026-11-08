"use client";

import { useEffect, useRef } from "react";

export default function SiteBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const spotlight = spotlightRef.current;
    if (!root || !spotlight) return;

    let pointerFrame = 0;
    const handleMove = (event: PointerEvent) => {
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const rect = root.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

        spotlight.style.setProperty("--mx", `${x}px`);
        spotlight.style.setProperty("--my", `${y}px`);
        spotlight.style.opacity = inside ? "0.6" : "0";
      });
    };

    let scrollFrame = 0;
    const updateFade = () => {
      scrollFrame = 0;
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      root.style.opacity = `${1 - progress}`;
    };
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(updateFade);
    };

    updateFade();
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      <div
        ref={spotlightRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%), linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)",
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
