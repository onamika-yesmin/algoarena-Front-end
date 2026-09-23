"use client";

import { useReveal } from "@/hooks/useReveal";
import styles from "./home.module.css";

/**
 * Section 5 of 8. The loop a solver repeats, in the order they meet it —
 * placed after the workspace tour so the steps describe a screen the
 * visitor has already seen.
 */

const STEPS = [
  {
    title: "Pick a problem",
    text: "Filter the library by topic and difficulty, or take the daily challenge and skip the deciding.",
    meta: "12 topics · easy to hard",
  },
  {
    title: "Write it and run it",
    text: "A real editor with starter code for your language, and sample tests you can run as many times as you like.",
    meta: "Python · C++ · JavaScript",
  },
  {
    title: "Submit for a verdict",
    text: "Hidden tests, runtime and memory come back within seconds — plus the exact case that failed, if one did.",
    meta: "Same judge as contests",
  },
  {
    title: "Learn, then climb",
    text: "Read the Big-O audit and the refactor note, bank your gems, and watch your rank move on the leaderboard.",
    meta: "Analytics update instantly",
  },
];

function Step({ index, step }: { index: number; step: (typeof STEPS)[number] }) {
  const reveal = useReveal<HTMLDivElement>(index as 0 | 1 | 2 | 3);
  return (
    <div ref={reveal.ref} className={`${styles.step} ${reveal.className}`}>
      <span className={styles.stepNum}>{index + 1}</span>
      <h3>{step.title}</h3>
      <p>{step.text}</p>
      <span className={styles.stepMeta}>{step.meta}</span>
    </div>
  );
}

export function HowItWorks() {
  const head = useReveal<HTMLDivElement>();

  return (
    <section className={styles.steps} id="how-it-works">
      <div className="section-shell">
        <div ref={head.ref} className={`${styles.headCentered} ${head.className}`}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} /> How it works
          </p>
          <h2>
            Four steps, then <span className={styles.accent}>repeat.</span>
          </h2>
          <p>Nothing to configure and nothing to install — the loop is the same on your first problem and your five hundredth.</p>
        </div>

        <div className={styles.stepGrid}>
          {STEPS.map((step, index) => (
            <Step key={step.title} index={index} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
