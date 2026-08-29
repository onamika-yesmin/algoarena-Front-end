"use client";

import { useReveal } from "@/hooks/useReveal";

const highlights = [
  ["01", "Practice with purpose", "Curated paths that make every challenge count."],
  ["02", "Compete in real time", "Weekly contests and a leaderboard that stays alive."],
  ["03", "Learn from the code", "Clear feedback to help you improve with intent."],
];

function StatItem({ number, title, text, delay }: { number: string; title: string; text: string; delay: 0 | 1 | 2 }) {
  const reveal = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={reveal.ref} className={reveal.className}>
      <span>{number}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export function HomeStats() {
  return (
    <section className="feature-band">
      <div className="section-shell stat-grid">
        {highlights.map(([number, title, text], index) => (
          <StatItem key={number} number={number} title={title} text={text} delay={index as 0 | 1 | 2} />
        ))}
      </div>
    </section>
  );
}
