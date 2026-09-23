"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { IconPlus } from "./icons";
import styles from "./home.module.css";

/**
 * Section 7 of 8. The questions that decide whether someone signs up,
 * answered in the open. Native <details> elements, so keyboard and screen
 * reader behaviour comes for free and the answers are in the HTML even
 * before JavaScript runs.
 */

const QUESTIONS = [
  {
    q: "Is AlgoArena actually free?",
    a: "Yes — the whole platform. Every problem, every contest, the AI panel and the kids zone are open to any account. Gems are earned by solving problems, never bought.",
  },
  {
    q: "Which languages can I submit?",
    a: "Python, C++ and JavaScript. Each problem ships starter code shaped for the language you pick, and every submission is compiled and run by the same judge — so your runtime is comparable with everyone else's.",
  },
  {
    q: "What are gems, and what do I spend them on?",
    a: "You earn gems for accepted solutions and spend them on hints. Tier 1 is a nudge, tier 2 sketches the approach, tier 3 gets close to the answer — and unlocking one carries a small scoring penalty, so asking for help stays a real decision.",
  },
  {
    q: "Do I need an account?",
    a: "Yes — everything past this page is behind a free account, because every problem, verdict, gem and streak is tied to you. Signing in with Google takes one click, and you are never asked for a card.",
  },
  {
    q: "How much should I trust the Big-O auditor?",
    a: "It analyses the structure of the code you submitted and reports its time and space complexity with a confidence level and the reasoning behind it. Read the reasoning — it is there so you can check the answer rather than take it on faith.",
  },
  {
    q: "Can I run a contest for my own group?",
    a: "Yes. Request a host account from the host page; once an admin approves it you get a host panel where you can create a contest, attach problems and follow the scoreboard live.",
  },
];

function FaqItem({ item }: { item: (typeof QUESTIONS)[number] }) {
  return (
    <details className={styles.faqItem}>
      <summary>
        {item.q}
        <span className={styles.faqSign} aria-hidden="true">
          <IconPlus size={15} />
        </span>
      </summary>
      <p className={styles.faqAnswer}>{item.a}</p>
    </details>
  );
}

export function HomeFaq() {
  const aside = useReveal<HTMLDivElement>();
  const list = useReveal<HTMLDivElement>(1);

  return (
    <section className={styles.faq} id="faq">
      <div className="section-shell">
        <div className={styles.faqLayout}>
          <div ref={aside.ref} className={`${styles.faqAside} ${aside.className}`}>
            <div className={styles.head}>
              <p className={styles.kicker}>
                <span className={styles.kickerDot} /> Good to know
              </p>
              <h2>
                Questions, <span className={styles.accent}>answered.</span>
              </h2>
            </div>
            <div className={styles.faqCard}>
              <h3>Still not sure?</h3>
              <p>
                Signing up takes one click with Google. Open your first problem, run the sample tests, and see the whole
                loop for yourself.
              </p>
              <Link className="button-outline" href="/signin?mode=register">
                Create a free account <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div ref={list.ref} className={`${styles.faqList} ${list.className}`}>
            {QUESTIONS.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
