import Link from "next/link";

export default function SubmissionsPage() {
  return <main className="section-shell workspace"><p className="eyebrow"><b />SUBMISSIONS</p><h1>Your submission history</h1><p>Run a solution from a problem workspace to begin building your history.</p><Link className="button" href="/problems/demo">Open code workspace <span aria-hidden="true">→</span></Link></main>;
}
