"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./status.module.css";

/**
 * Route-level error boundary. Without it an uncaught render error drops the
 * visitor onto Next's unstyled default with no retry and no navigation.
 *
 * No SiteHeader/SiteFooter here on purpose: if the crash came from the auth
 * provider, rendering those would throw again inside the boundary.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the browser console and, on Vercel, in the function logs.
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <main>
      <section className={styles.wrap}>
        <div className={styles.inner}>
          <p className={styles.code}>500</p>
          <h1>Something broke on our side.</h1>
          <p>
            This one is on us, not you. Try again — if it keeps happening, head back to the homepage and take another
            route in.
          </p>
          <div className={styles.actions}>
            <button className="button" type="button" onClick={() => reset()}>
              Try again <span aria-hidden="true">→</span>
            </button>
            <Link className="button-outline" href="/">
              Back to home
            </Link>
          </div>
          {error.digest && <p className={styles.detail}>Reference: {error.digest}</p>}
        </div>
      </section>
    </main>
  );
}
