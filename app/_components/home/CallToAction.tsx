import Link from "next/link";

export function CallToAction() {
  return <section className="cta section-shell"><p className="eyebrow">THE ARENA IS OPEN</p><h2>Ready to make your<br /><em>next solution count?</em></h2><Link className="button" href="/problems">Enter AlgoArena <span aria-hidden="true">→</span></Link></section>;
}
