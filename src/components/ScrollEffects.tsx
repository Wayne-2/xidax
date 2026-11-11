"use client";

import { useEffect, useRef } from "react";

export default function ScrollEffects() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scrollFrame = 0;

    const update = () => {
      scrollFrame = 0;

      const progressBar = progressRef.current;
      if (!progressBar) return;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressBar.style.transform = `scaleX(${progress})`;
    };

    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
    };
  }, []);

  return (
    <div
      ref={progressRef}
      style={{ transform: "scaleX(0)" }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-[#5865F2] shadow-[0_0_12px_rgba(88,101,242,0.8)]"
      aria-hidden="true"
    />
  );
}
