"use client";

import { useReveal } from "@/hooks/useReveal";
import styles from "./home.module.css";

/**
 * Section 2 of 8. Answers the first question a visitor has after the hero —
 * "what can I actually practise here?" — with the topic list itself rather
 * than a claim about it, plus the three languages the judge compiles.
 */

const TOPICS = [
  "Arrays",
  "Strings",
  "Hash maps",
  "Two pointers",
  "Sliding window",
  "Binary search",
  "Sorting",
  "Recursion",
  "Backtracking",
  "Greedy",
  "Dynamic programming",
  "Graphs",
  "Trees",
  "Heaps",
  "Bit manipulation",
  "Math",
];

const LANGUAGES = [
  {
    name: "Python",
    note: "Starter code included",
    badge: "Py",
    tint: "rgba(255, 212, 59, .14)",
    color: "#ffd43b",
    snippet: "def solve(nums: list[int]) -> int:",
  },
  {
    name: "C++",
    note: "Starter code included",
    badge: "C++",
    tint: "rgba(101, 154, 210, .16)",
    color: "#8ab4e8",
    snippet: "int solve(vector<int>& nums) {",
  },
  {
    name: "JavaScript",
    note: "Starter code included",
    badge: "JS",
    tint: "rgba(247, 223, 30, .12)",
    color: "#f2dd6e",
    snippet: "function solve(nums) {",
  },
];

function Marquee({ items, reverse }: { items: string[]; reverse?: boolean }) {
  return (
    <div className={`${styles.marquee}${reverse ? ` ${styles.marqueeReverse}` : ""}`}>
      <div className={styles.marqueeTrack}>
        {/* Rendered twice: the animation translates the track -50%, so the
            second copy slides into the first copy's place with no jump. */}
        {[...items, ...items].map((topic, index) => (
          <span key={`${topic}-${index}`} className={styles.topicChip} aria-hidden={index >= items.length}>
            <b>/</b>
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProofBand() {
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section className={styles.proof} id="topics">
      <div className="section-shell">
        <p className={styles.proofLabel}>Practise every topic an interview throws at you</p>
      </div>

      <Marquee items={TOPICS.slice(0, 8)} />
      <Marquee items={TOPICS.slice(8)} reverse />

      <div className="section-shell">
        <div ref={reveal.ref} className={`${styles.langGrid} ${reveal.className}`}>
          {LANGUAGES.map((lang) => (
            <article key={lang.name} className={styles.langCard}>
              <div className={styles.langHead}>
                <span className={styles.langBadge} style={{ background: lang.tint, color: lang.color }} aria-hidden="true">
                  {lang.badge}
                </span>
                <div>
                  <h3>{lang.name}</h3>
                  <span>{lang.note}</span>
                </div>
              </div>
              <code>{lang.snippet}</code>
            </article>
          ))}
        </div>

        <p className={styles.proofNote}>
          Every run and every submission goes through the <b>same judge</b> that scores live contests — so a green tick in
          practice means the same thing it does on the scoreboard.
        </p>
      </div>
    </section>
  );
}
