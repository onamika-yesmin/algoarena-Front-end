"use client";

import { useReveal } from "@/hooks/useReveal";
import { IconBolt, IconChart, IconGauge, IconGem, IconLibrary, IconSparkle, IconWand } from "./icons";
import styles from "./home.module.css";

/**
 * Section 3 of 8. The bento grid: one tile per thing AlgoArena does inside a
 * problem, each carrying a small mock of the real UI so the claim and the
 * evidence sit in the same card.
 */

const SPARK_BARS = [38, 54, 30, 72, 48, 88, 64, 96];

function Tile({
  span,
  delay,
  children,
}: {
  span: "wide" | "half" | "third";
  delay: 0 | 1 | 2 | 3 | 4 | 5;
  children: React.ReactNode;
}) {
  const reveal = useReveal<HTMLElement>(delay);
  const spanClass = span === "wide" ? styles.tileWide : span === "half" ? styles.tileHalf : styles.tileThird;
  return (
    <article ref={reveal.ref} className={`${styles.tile} ${spanClass} ${reveal.className}`}>
      {children}
    </article>
  );
}

export function FeatureBento() {
  const head = useReveal<HTMLDivElement>();

  return (
    <section className={styles.bento} id="features">
      <div className="section-shell">
        <div ref={head.ref} className={`${styles.head} ${head.className}`}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} /> Inside every problem
          </p>
          <h2>
            A judge, a coach and a scoreboard — <span className={styles.accent}>all in one tab.</span>
          </h2>
          <p>
            Most sites tell you whether you passed. AlgoArena also tells you why, what it cost you, and what a cleaner
            version of your own solution looks like.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          <Tile span="wide" delay={0}>
            <span className={`${styles.tileIcon} ${styles.tileIconGreen}`}>
              <IconBolt />
            </span>
            <h3>Real verdicts against hidden tests</h3>
            <p>
              Run your code on the samples while you work, then submit and watch every hidden test resolve one by one —
              with runtime, the failing case, and a plain-language reason when something breaks.
            </p>
            <div className={styles.tileArt}>
              <div className={styles.judgeMeta}>
                <b>Accepted</b> 12 / 12 tests <small>48 ms · 16.2 MB</small>
              </div>
              <div className={styles.testGrid}>
                {Array.from({ length: 12 }, (_, index) => (
                  <span key={index} className={styles.testCell} style={{ animationDelay: `${index * 55}ms` }} />
                ))}
              </div>
            </div>
          </Tile>

          <Tile span="third" delay={1}>
            <span className={`${styles.tileIcon} ${styles.tileIconOrange}`}>
              <IconGem size={20} />
            </span>
            <h3>Gems worth earning</h3>
            <p>Solve to earn them, spend them on hints. Suddenly asking for help is a decision, not a reflex.</p>
            <div className={styles.tileArt}>
              <div className={styles.miniRows}>
                <span className={styles.miniRow}>
                  Solved · Medium <b>+15</b>
                </span>
                <span className={styles.miniRow}>
                  Hint · Tier 2 <b>−5</b>
                </span>
              </div>
            </div>
          </Tile>

          <Tile span="third" delay={2}>
            <span className={styles.tileIcon}>
              <IconSparkle />
            </span>
            <h3>Hints, one tier at a time</h3>
            <p>A nudge first, the approach next, the near-solution last — you choose how much to spoil.</p>
            <div className={styles.tileArt}>
              <div className={styles.miniRows}>
                <span className={styles.miniRow}>Tier 1 · nudge</span>
                <span className={`${styles.miniRow} ${styles.miniRowLocked}`}>
                  Tier 2 · approach <b>3 gems</b>
                </span>
              </div>
            </div>
          </Tile>

          <Tile span="third" delay={3}>
            <span className={`${styles.tileIcon} ${styles.tileIconCyan}`}>
              <IconGauge />
            </span>
            <h3>The Big-O you actually wrote</h3>
            <p>An auditor reads your submission and reports its real time and space cost — with the reasoning.</p>
            <div className={styles.tileArt}>
              <div className={styles.bigO}>
                <strong>O(n)</strong>
                <span>time · O(1) space · high confidence</span>
              </div>
            </div>
          </Tile>

          <Tile span="third" delay={4}>
            <span className={styles.tileIcon}>
              <IconWand />
            </span>
            <h3>Refactor recommendations</h3>
            <p>A cleaner version of your solution, side by side with yours, so you can see the difference.</p>
            <div className={styles.tileArt}>
              <div className={styles.diff}>
                <span className={styles.diffMinus}>- for i in range(len(nums)):</span>
                <span className={styles.diffPlus}>+ for i, v in enumerate(nums):</span>
              </div>
            </div>
          </Tile>

          <Tile span="half" delay={5}>
            <span className={`${styles.tileIcon} ${styles.tileIconCyan}`}>
              <IconChart />
            </span>
            <h3>Analytics that show the trend</h3>
            <p>
              Verdict mix, language split, difficulty spread and your solving streak — so you can see progress on the
              weeks it doesn&apos;t feel like progress.
            </p>
            <div className={styles.tileArt}>
              <div className={styles.spark}>
                {SPARK_BARS.map((height, index) => (
                  <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }} />
                ))}
              </div>
            </div>
          </Tile>

          <Tile span="half" delay={5}>
            <span className={`${styles.tileIcon} ${styles.tileIconOrange}`}>
              <IconLibrary />
            </span>
            <h3>Write problems, not just solutions</h3>
            <p>
              Propose a problem with your own statement and test cases. An admin reviews it, and once it&apos;s approved
              the whole arena solves what you wrote.
            </p>
            <div className={styles.tileArt}>
              <div className={styles.pillRow}>
                <span className={`${styles.statusPill} ${styles.statusPending}`}>Pending review</span>
                <span className={`${styles.statusPill} ${styles.statusApproved}`}>Approved</span>
                <span className={`${styles.statusPill} ${styles.statusLive}`}>Live in the library</span>
              </div>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
