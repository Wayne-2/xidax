"use client";

import { useEffect } from "react";

export default function RevealObserver() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frame = 0;

    const reveal = () => {
      frame = 0;
      const trigger = window.innerHeight * 0.9;

      // Re-query on every frame so asynchronously-rendered elements (live
      // catalog data, filtered lists) are revealed too — not just the nodes
      // present when the observer mounted.
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)")
        .forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.top < trigger || rect.bottom <= 0) {
            element.classList.add("is-visible");
          }
        });
    };

    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(reveal);
    };

    if (reducedMotion) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.classList.add("is-visible");
      });
    } else {
      reveal();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    // Watch for new [data-reveal] nodes added after mount.
    const observer = new MutationObserver(handleScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
