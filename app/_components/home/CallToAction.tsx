"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { useAuth } from "@/providers/AuthProvider";
import { IconCheck } from "./icons";
import styles from "./home.module.css";

/**
 * Section 8 of 8. The last thing on the page is the same offer the hero
 * opened with — phrased for whichever visitor is reading it.
 */
export function CallToAction() {
  const reveal = useReveal<HTMLDivElement>();
  const { user, isLoading } = useAuth();
  const isSignedIn = !isLoading && Boolean(user);

  return (
    <section className={styles.cta}>
      <div className="section-shell">
        <div ref={reveal.ref} className={`${styles.ctaPanel} ${reveal.className}`}>
          <span className={`${styles.ctaOrb} ${styles.ctaOrbA}`} aria-hidden="true" />
          <span className={`${styles.ctaOrb} ${styles.ctaOrbB}`} aria-hidden="true" />

          <div className={styles.ctaInner}>
            <h2>
              Your next solution is
              <br />
              <span className={styles.accent}>one click away.</span>
            </h2>
            <p>
              {isSignedIn
                ? "Pick up where you left off — the library, the next contest and your analytics are all waiting."
                : "Create an account, open a problem and submit it. You'll have a verdict, a complexity audit and your first gems before the kettle boils."}
            </p>

            <div className={styles.ctaActions}>
              {isSignedIn ? (
                <>
                  <Link className="button" href="/problems">
                    Enter the arena <span aria-hidden="true">→</span>
                  </Link>
                  <Link className="button-outline" href="/contest">
                    See live contests
                  </Link>
                </>
              ) : (
                <>
                  <Link className="button" href="/signin?mode=register">
                    Create a free account <span aria-hidden="true">→</span>
                  </Link>
                  <Link className="button-outline" href="/problems">
                    Look around first
                  </Link>
                </>
              )}
            </div>

            <ul className={styles.ctaNote}>
              <li>
                <IconCheck size={13} /> No card, no trial clock
              </li>
              <li>
                <IconCheck size={13} /> Sign in with Google in one click
              </li>
              <li>
                <IconCheck size={13} /> Your progress saves automatically
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
