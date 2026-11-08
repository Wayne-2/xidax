"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ParallaxProps = {
  speed?: number;
  className?: string;
  children: ReactNode;
};

export default function Parallax({
  speed = 0.08,
  className,
  children,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const anchor = element.parentElement ?? element;
      const rect = anchor.getBoundingClientRect();
      const viewport = window.innerHeight;
      if (rect.bottom < -200 || rect.top > viewport + 200) return;
      const offset = (rect.top + rect.height / 2 - viewport / 2) * speed;
      element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
