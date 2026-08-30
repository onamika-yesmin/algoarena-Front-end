"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";

const paths = [
  { tone: "purple", label: "01 / PRACTISE", title: <>Master the<br />fundamentals.</>, text: "Build confidence, one thoughtful problem at a time.", href: "/problems", action: "Start practising", icon: "⌘" },
  { tone: "cyan", label: "02 / COMPETE", title: <>Feel the<br />countdown.</>, text: "Test your instincts in contests built for momentum.", href: "/contest", action: "See contests", icon: "◴" },
  { tone: "orange", label: "03 / CONNECT", title: <>Grow with<br />your peers.</>, text: "Share solutions, gain perspective, and keep moving.", href: "/leaderboard", action: "Meet the community", icon: "◎" },
];

function PathCard({ path, delay }: { path: (typeof paths)[number]; delay: 0 | 1 | 2 | 3 | 4 | 5 }) {
  const reveal = useReveal<HTMLElement>(delay);
  return (
    <article ref={reveal.ref} className={`path-card ${path.tone} ${reveal.className}`}>
      <span>{path.label}</span>
      <h3>{path.title}</h3>
      <p>{path.text}</p>
      <Link href={path.href}>{path.action} <span aria-hidden="true">→</span></Link>
      <div className="card-icon" aria-hidden="true">{path.icon}</div>
    </article>
  );
}

export function LearningPaths() {
  const intro = useReveal<HTMLDivElement>();

  return (
    <section className="paths section-shell">
      <div ref={intro.ref} className={`section-intro ${intro.className}`}>
        <p className="eyebrow">FIND YOUR FLOW</p>
        <h2>One arena. Every way<br />you want to grow.</h2>
        <Link className="text-link" href="/problems">Browse all tracks <span aria-hidden="true">→</span></Link>
      </div>
      <div className="path-grid">
        {paths.map((path, index) => (
          <PathCard key={path.label} path={path} delay={index as 0 | 1 | 2} />
        ))}
      </div>
    </section>
  );
}
