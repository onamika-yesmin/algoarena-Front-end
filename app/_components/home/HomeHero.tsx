"use client";

import Image from "next/image";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { useAuth } from "@/providers/AuthProvider";
import { CountUp } from "@/components/ui/CountUp";
import { IconCheck, IconGem } from "./icons";
import styles from "./home.module.css";

/**
 * Section 1 of 8. Opens with the promise, the two things a visitor can do
 * next, and a composed visual — the photo frame carries the mood, the
 * editor card and the two status chips show what the product actually
 * does, so nobody has to scroll to find out.
 */
export function HomeHero() {
  const copy = useReveal<HTMLDivElement>();
  const visual = useReveal<HTMLDivElement>(2);
  const { user, isLoading } = useAuth();
  const isSignedIn = !isLoading && Boolean(user);

  return (
    <section className={styles.hero}>
      <div className={styles.heroBackdrop} aria-hidden="true">
        <span className={`${styles.heroOrb} ${styles.heroOrbA}`} />
        <span className={`${styles.heroOrb} ${styles.heroOrbB}`} />
      </div>

      <div className="section-shell">
        <div className={styles.heroInner}>
          <div ref={copy.ref} className={copy.className}>
            <p className={styles.kicker}>
              <span className={styles.kickerDot} /> Practise · Compete · Get hired
            </p>

            <h1 className={styles.heroTitle}>
              Code it. Run it.
              <br />
              <span className={styles.accent}>Own the leaderboard.</span>
            </h1>

            <p className={styles.heroLede}>
              AlgoArena judges every submission against real hidden tests, then an AI coach tells you what to fix — a
              nudge when you&apos;re stuck, the Big-O you actually wrote, and a cleaner version of your own code. Take it
              into a live contest when you&apos;re ready.
            </p>

            <div className={styles.heroActions}>
              <Link className="button" href={isSignedIn ? "/problems" : "/signin?mode=register"}>
                {isSignedIn ? "Continue solving" : "Start solving — free"} <span aria-hidden="true">→</span>
              </Link>
              <Link className="button-outline" href="/problems">
                Browse the problem library
              </Link>
            </div>

            <ul className={styles.heroTicks}>
              <li>
                <IconCheck size={14} /> Free to use
              </li>
              <li>
                <IconCheck size={14} /> Python, C++ &amp; JavaScript
              </li>
              <li>
                <IconCheck size={14} /> Nothing to install
              </li>
            </ul>

            <div className={styles.heroStats}>
              <div>
                <b>
                  <CountUp value={12} />
                </b>
                <small>topic tracks to practise</small>
              </div>
              <div>
                <b>
                  <CountUp value={4} />
                </b>
                <small>AI tools in every problem</small>
              </div>
              <div>
                <b>
                  <CountUp value={100} suffix="%" />
                </b>
                <small>free, forever</small>
              </div>
            </div>
          </div>

          <div ref={visual.ref} className={`${styles.heroVisual} ${visual.className}`}>
            <div className={styles.heroPhoto}>
              <Image
                src="/images/hero-code.jpg"
                alt="A developer's screen filled with syntax-highlighted code"
                fill
                priority
                sizes="(max-width: 1060px) 100vw, 560px"
              />
              <span className={styles.heroPhotoVeil} />
            </div>

            <div className={styles.heroEditor}>
              <div className={styles.heroEditorBar}>
                <span className={styles.heroEditorDots}>
                  <b />
                  <b />
                  <b />
                </span>
                two_sum.py
                <small>Python</small>
              </div>
              <ol className={styles.heroCode}>
                <li>
                  <code>
                    <i>def</i> <b>two_sum</b>(nums, target):
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;seen = {"{}"}</code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;<i>for</i> i, v <i>in</i> <b>enumerate</b>(nums):
                  </code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;&nbsp;&nbsp;<i>if</i> target - v <i>in</i> seen:
                  </code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>return</i> [seen[target - v], i]
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;&nbsp;&nbsp;seen[v] = i</code>
                </li>
              </ol>
              <div className={styles.heroRun}>
                <IconCheck size={13} /> 12/12 tests passed
                <small>O(n) · 48 ms</small>
              </div>
            </div>

            <div className={`${styles.heroChip} ${styles.heroChipVerdict}`}>
              <IconCheck size={17} />
              <span>
                <b>Accepted</b>
                <small>hidden tests · 48 ms</small>
              </span>
            </div>

            <div className={`${styles.heroChip} ${styles.heroChipGems}`}>
              <IconGem size={17} />
              <span>
                <b>+15 gems</b>
                <small>first-try solve</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
