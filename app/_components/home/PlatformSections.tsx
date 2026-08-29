import Link from "next/link";

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

export function PlatformSections() {
  return <section className="platform-section section-shell"><div className="section-intro"><p className="eyebrow">BUILD YOUR ROUTINE</p><h2>Everything you need<br />to keep improving.</h2></div><div className="platform-grid">{sections.map((item) => <article key={item.number} className="platform-card"><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><Link href={item.href}>{item.action} <b aria-hidden="true">→</b></Link></article>)}</div></section>;
}
