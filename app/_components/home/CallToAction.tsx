"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { useAuth } from "@/providers/AuthProvider";

export function CallToAction() {
  const reveal = useReveal<HTMLElement>();
  const { user, isLoading } = useAuth();
  const showGuestCta = !isLoading && !user;

  return (
    <section ref={reveal.ref} className={`cta section-shell ${reveal.className}`}>
      <div className="cta-glow" aria-hidden="true" />
      <p className="eyebrow">THE ARENA IS OPEN</p>
      <h2>Ready to make your<br /><span className="text-gradient">next solution count?</span></h2>
      <div className="button-row" style={{ justifyContent: "center", marginTop: 8 }}>
        {showGuestCta ? (
          <>
            <Link className="button" href="/signin?mode=register">Create a free account <span aria-hidden="true">→</span></Link>
            <Link className="button-outline" href="/problems">Browse problems first</Link>
          </>
        ) : (
          <Link className="button" href="/problems">Enter AlgoArena <span aria-hidden="true">→</span></Link>
        )}
      </div>
    </section>
  );
}
