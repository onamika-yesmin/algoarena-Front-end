import Link from "next/link";

const sections = [
  { number: "01", title: "Daily challenges", text: "Build a durable habit with focused problems every day.", href: "/problems", action: "Solve today’s problem" },
  { number: "02", title: "Problem library", text: "Filter coding challenges by topic and difficulty.", href: "/problems", action: "Browse problems" },
  { number: "03", title: "Live contests", text: "Work under a clock and test your rank with the community.", href: "/contest", action: "See contests" },
  { number: "04", title: "Leaderboard", text: "Track progress and discover the strongest solvers.", href: "/leaderboard", action: "View rankings" },
  { number: "05", title: "Submission history", text: "Return to each attempt and improve your approach.", href: "/submissions", action: "View submissions" },
  { number: "06", title: "AI practice tools", text: "Use guided feedback to understand your next move.", href: "/analytics", action: "Open analytics" },
  { number: "07", title: "Mock interviews", text: "Practise explaining your thinking before the real interview.", href: "/interview/demo", action: "Start an interview" },
  { number: "08", title: "Your profile", text: "Keep your learning streak, achievements, and goals together.", href: "/profile", action: "Go to profile" },
];

export function PlatformSections() {
  return <section className="platform-section section-shell"><div className="section-intro"><p className="eyebrow">BUILD YOUR ROUTINE</p><h2>Everything you need<br />to keep improving.</h2></div><div className="platform-grid">{sections.map((item) => <article key={item.number} className="platform-card"><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href}>{item.action} <b aria-hidden="true">→</b></Link></article>)}</div></section>;
}
