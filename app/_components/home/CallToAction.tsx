"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

export function CallToAction() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section ref={reveal.ref} className={`cta section-shell ${reveal.className}`}>
      <div className="cta-glow" aria-hidden="true" />
      <p className="eyebrow">THE ARENA IS OPEN</p>
      <h2>Ready to make your<br /><span className="text-gradient">next solution count?</span></h2>
      <Link className="button" href="/problems">Enter AlgoArena <span aria-hidden="true">→</span></Link>
    </section>
  );
}
