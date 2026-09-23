import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "./_components/home/SiteHeader";
import { SiteFooter } from "./_components/home/SiteFooter";
import styles from "./status.module.css";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Replaces Next's default 404, which rendered as bare black-on-white text
 * with no header, no footer and no way back into the site.
 */
export default function NotFound() {
  return (
    <main>
      <SiteHeader />
      <section className={styles.wrap}>
        <div className={styles.inner}>
          <p className={styles.code}>404</p>
          <h1>This page took a wrong turn.</h1>
          <p>
            The link may be out of date, or the problem, contest or solution it pointed at may have been removed. Here
            is the way back in.
          </p>
          <div className={styles.actions}>
            <Link className="button" href="/">
              Back to home <span aria-hidden="true">→</span>
            </Link>
            <Link className="button-outline" href="/problems">
              Go to the problem library
            </Link>
          </div>
          <ul className={styles.links}>
            <li>
              <Link href="/contest">Contests</Link>
            </li>
            <li>
              <Link href="/leaderboard">Leaderboard</Link>
            </li>
            <li>
              <Link href="/community">Community</Link>
            </li>
            <li>
              <Link href="/kids">Kids zone</Link>
            </li>
            <li>
              <Link href="/signin">Sign in</Link>
            </li>
          </ul>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
