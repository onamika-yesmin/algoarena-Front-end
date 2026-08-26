"use client";

import Link from "next/link";
import { SiteHeader } from "./_components/home/SiteHeader";
import { SiteFooter } from "./_components/home/SiteFooter";
import { HomeStats } from "./_components/home/HomeStats";
import { LearningPaths } from "./_components/home/LearningPaths";
import { CallToAction } from "./_components/home/CallToAction";

const Arrow = () => <span aria-hidden="true">→</span>;

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow"><b /> YOUR NEXT LEVEL STARTS HERE</p>
          <h1>Think deeper.<br /><em>Code sharper.</em></h1>
          <p className="hero-text">A focused arena to practise real problems, learn from every submission, and compete with developers who love the craft.</p>
          <div className="hero-actions">
            <Link className="button" href="/problems">Explore problems <Arrow /></Link>
            <Link className="text-link" href="/contest">View live contests <Arrow /></Link>
          </div>
          <div className="proof"><strong>10,000+</strong><span>solutions written this week</span><b>•</b><strong>4.9/5</strong><span>learner rating</span></div>
        </div>
        <div className="hero-visual" aria-label="Code editor preview">
          <div className="editor-top"><div className="dots"><b /><b /><b /></div><span>two_sum.py</span><small>Python</small></div>
          <div className="editor-body"><ol><li><code><i>def</i> <b>two_sum</b>(nums, target):</code></li><li><code>&nbsp;&nbsp;seen = {'{}'}</code></li><li><code>&nbsp;&nbsp;<i>for</i> index, value <i>in</i> enumerate(nums):</code></li><li><code>&nbsp;&nbsp;&nbsp;&nbsp;needed = target - value</code></li><li><code>&nbsp;&nbsp;&nbsp;&nbsp;<i>if</i> needed <i>in</i> seen:</code></li><li><code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>return</i> [seen[needed], index]</code></li><li><code>&nbsp;&nbsp;&nbsp;&nbsp;seen[value] = index</code></li></ol></div>
          <div className="run-row"><span><b>✓</b> Accepted</span><small>Runtime: 48 ms</small><button>Run code</button></div>
          <div className="floating-card"><span className="pulse" /> Streak <b>12 days</b><strong>↗</strong></div>
        </div>
      </section>

      <HomeStats />

      <LearningPaths />

      <CallToAction />

      <SiteFooter />
    </main>
  );
}
