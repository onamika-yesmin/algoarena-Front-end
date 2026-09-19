"use client";

import Image from "next/image";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { IconArrow, IconBlocks, IconCheck, IconMic, IconTrophy, IconUsers } from "./icons";
import styles from "./home.module.css";

/**
 * Section 6 of 8. The four places to go once the daily practice loop isn't
 * enough any more. Each card leads straight to its route, so this doubles
 * as the homepage's real navigation for a first-time visitor.
 */

const MODES = [
  {
    href: "/contest",
    badge: "Contests",
    badgeTone: "modeBadgeOrange",
    icon: <IconTrophy size={15} />,
    image: "/images/mode-contest.jpg",
    alt: "Competitors at rows of laptops in a darkened hall",
    title: "Put a clock on it",
    text: "Register for a scheduled contest, solve the set before the timer runs out, and watch the scoreboard reorder itself while you work.",
    points: ["Live scoreboard during the round", "Every solve feeds the global leaderboard", "Host your own with an approved host account"],
    cta: "See upcoming contests",
  },
  {
    href: "/interview",
    badge: "Mock interview",
    badgeTone: "modeBadgeViolet",
    icon: <IconMic size={15} />,
    image: "/images/mode-interview.jpg",
    alt: "Two people working across a table from each other on laptops",
    title: "Practise saying it out loud",
    text: "Pick a topic and difficulty, then talk through a problem with an interviewer that asks the follow-ups a real one would.",
    points: ["Arrays, strings, DP, graphs or general", "Follow-ups based on what you actually said", "A score out of 10 with written feedback"],
    cta: "Start a mock interview",
  },
  {
    href: "/community",
    badge: "Community",
    badgeTone: "modeBadgeCyan",
    icon: <IconUsers size={15} />,
    image: "/images/mode-community.jpg",
    alt: "Two developers reviewing code together on a monitor",
    title: "See how everyone else solved it",
    text: "Every accepted solution becomes public. Read a different approach, compare runtimes, and argue about it in the comments.",
    points: ["Browse accepted solutions by problem", "Compare approaches and languages", "Comment threads on every solution"],
    cta: "Browse the feed",
  },
  {
    href: "/kids",
    badge: "Kids zone",
    badgeTone: "modeBadgeGreen",
    icon: <IconBlocks size={15} />,
    image: "/images/mode-kids.jpg",
    alt: "A pile of brightly coloured building blocks",
    title: "Where the next ones start",
    text: "Drag-and-drop block puzzles first, gentle Python next — with a mascot, stars for every level and progress that saves itself.",
    points: ["Block puzzles before any typing", "Python levels with friendly error messages", "Stars, streaks and a celebration screen"],
    cta: "Open the kids zone",
  },
] as const;

function ModeCard({ mode, delay }: { mode: (typeof MODES)[number]; delay: 0 | 1 | 2 | 3 }) {
  const reveal = useReveal<HTMLAnchorElement>(delay);
  return (
    <Link ref={reveal.ref} href={mode.href} className={`${styles.modeCard} ${reveal.className}`}>
      <div className={styles.modeMedia}>
        <Image src={mode.image} alt={mode.alt} fill sizes="(max-width: 820px) 100vw, 580px" />
        <span className={styles.modeVeil} />
        <span className={`${styles.modeBadge} ${styles[mode.badgeTone]}`}>
          {mode.icon}
          {mode.badge}
        </span>
      </div>
      <div className={styles.modeBody}>
        <h3>{mode.title}</h3>
        <p>{mode.text}</p>
        <ul className={styles.modeList}>
          {mode.points.map((point) => (
            <li key={point}>
              <IconCheck size={13} /> {point}
            </li>
          ))}
        </ul>
        <span className={styles.modeLink}>
          {mode.cta} <IconArrow size={15} />
        </span>
      </div>
    </Link>
  );
}

export function ArenaModes() {
  const head = useReveal<HTMLDivElement>();

  return (
    <section className={styles.modes} id="arena">
      <div className="section-shell">
        <div ref={head.ref} className={`${styles.head} ${head.className}`}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} /> More than a problem list
          </p>
          <h2>
            Four more rooms in <span className={styles.accent}>the arena.</span>
          </h2>
          <p>
            Practice is the floor, not the ceiling. Compete against a clock, rehearse the interview, read everyone
            else&apos;s solutions — or hand the whole thing to a nine-year-old and watch them start.
          </p>
        </div>

        <div className={styles.modeGrid}>
          {MODES.map((mode, index) => (
            <ModeCard key={mode.href} mode={mode} delay={index as 0 | 1 | 2 | 3} />
          ))}
        </div>
      </div>
    </section>
  );
}
