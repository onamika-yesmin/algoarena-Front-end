"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal primitive: returns a ref to attach to any element plus a
 * className that fades/slides it into place the first time it enters the
 * viewport. Two things keep this from ever hiding real content: a visitor
 * who prefers reduced motion gets the "visible" class immediately, and
 * app/globals.css carries a <noscript> override that forces everything
 * visible when JavaScript never runs at all.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(delay: 0 | 1 | 2 | 3 | 4 | 5 = 0) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const className = `reveal${delay ? ` reveal-delay-${delay}` : ""}${isVisible ? " is-visible" : ""}`;
  return { ref, className, isVisible };
}
