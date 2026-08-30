"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

// Contests, leaderboard, mock interviews, and the community feed each get
// their own full spotlight section on the homepage (see EditorSpotlight,
// InterviewSpotlight, ContestSpotlight, CommunitySpotlight) — this grid
// only covers what's left, so nothing is pitched to visitors twice.
const sections = [
  { number: "01", title: "Daily challenges", text: "Build a durable habit with focused problems every day.", href: "/problems", action: "Solve today’s problem" },
  { number: "02", title: "Problem library", text: "Filter coding challenges by topic and difficulty.", href: "/problems", action: "Browse problems" },
  { number: "03", title: "Submission history", text: "Return to each attempt and improve your approach.", href: "/submissions", action: "View submissions" },
  { number: "04", title: "Your analytics", text: "Verdicts, languages, difficulty, and your solving streak.", href: "/analytics", action: "Open analytics" },
  { number: "05", title: "Your profile", text: "Keep your learning streak, achievements, and goals together.", href: "/profile", action: "Go to profile" },
  { number: "06", title: "Sign in with Google", text: "One click, and your progress follows you everywhere.", href: "/signin", action: "Sign in" },
];

const DELAYS = [0, 1, 2, 3, 4, 5] as const;

function PlatformCard({ item, delay }: { item: (typeof sections)[number]; delay: (typeof DELAYS)[number] }) {
  const reveal = useReveal<HTMLElement>(delay);
  return (
    <article ref={reveal.ref} className={`platform-card ${reveal.className}`}>
      <span>{item.number}</span>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
      <Link href={item.href}>{item.action} <b aria-hidden="true">→</b></Link>
    </article>
  );
}

export function PlatformSections() {
  const intro = useReveal<HTMLDivElement>();

  return (
    <section className="platform-section section-shell">
      <div ref={intro.ref} className={`section-intro ${intro.className}`}>
        <p className="eyebrow">BUILD YOUR ROUTINE</p>
        <h2>Everything you need<br />to keep improving.</h2>
      </div>
      <div className="platform-grid">
        {sections.map((item, index) => (
          <PlatformCard key={item.number} item={item} delay={DELAYS[index % DELAYS.length]} />
        ))}
      </div>
    </section>
  );
}
