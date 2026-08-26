import Link from "next/link";

const paths = [
  { tone: "purple", label: "01 / PRACTISE", title: <>Master the<br />fundamentals.</>, text: "Build confidence, one thoughtful problem at a time.", href: "/problems", action: "Start practising", icon: "⌘" },
  { tone: "cyan", label: "02 / COMPETE", title: <>Feel the<br />countdown.</>, text: "Test your instincts in contests built for momentum.", href: "/contest", action: "See contests", icon: "◴" },
  { tone: "orange", label: "03 / CONNECT", title: <>Grow with<br />your peers.</>, text: "Share solutions, gain perspective, and keep moving.", href: "/leaderboard", action: "Meet the community", icon: "◎" },
];

export function LearningPaths() {
  return <section className="paths section-shell"><div className="section-intro"><p className="eyebrow">FIND YOUR FLOW</p><h2>One arena. Every way<br />you want to grow.</h2><Link className="text-link" href="/problems">Browse all tracks <span aria-hidden="true">→</span></Link></div><div className="path-grid">{paths.map((path) => <article className={`path-card ${path.tone}`} key={path.label}><span>{path.label}</span><h3>{path.title}</h3><p>{path.text}</p><Link href={path.href}>{path.action} <span aria-hidden="true">→</span></Link><div className="card-icon" aria-hidden="true">{path.icon}</div></article>)}</div></section>;
}
