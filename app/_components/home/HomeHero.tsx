"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { CountUp } from "@/components/ui/CountUp";

export function HomeHero() {
  const copy = useReveal<HTMLDivElement>();
  const visual = useReveal<HTMLDivElement>(2);

  return (
    <section className="hero section-shell">
      <div className="hero-glow" aria-hidden="true" />
      <div ref={copy.ref} className={`hero-copy ${copy.className}`}>
        <p className="eyebrow"><b /> YOUR NEXT LEVEL STARTS HERE</p>
        <h1>Think deeper.<br /><span className="text-gradient">Code sharper.</span></h1>
        <p className="hero-text">A focused arena to practise real problems, learn from every submission, and compete with developers who love the craft.</p>
        <div className="hero-actions">
          <Link className="button" href="/problems">Explore problems <span aria-hidden="true">→</span></Link>
          <Link className="text-link" href="/contest">View live contests <span aria-hidden="true">→</span></Link>
        </div>
        <div className="proof">
          <strong><CountUp value={10000} suffix="+" /></strong><span>solutions written this week</span>
          <b>•</b>
          <strong><CountUp value={4.9} decimals={1} suffix="/5" /></strong><span>learner rating</span>
        </div>
      </div>
      <div ref={visual.ref} className={`hero-visual ${visual.className}`} aria-label="Code editor preview">
        <div className="editor-top">
          <div className="dots"><b /><b /><b /></div>
          <span>two_sum.py</span>
          <small>Python</small>
        </div>
        <div className="editor-body">
          <ol>
            <li><code><i>def</i> <b>two_sum</b>(nums, target):</code></li>
            <li><code>&nbsp;&nbsp;seen = {"{}"}</code></li>
            <li><code>&nbsp;&nbsp;<i>for</i> index, value <i>in</i> enumerate(nums):</code></li>
            <li><code>&nbsp;&nbsp;&nbsp;&nbsp;needed = target - value</code></li>
            <li><code>&nbsp;&nbsp;&nbsp;&nbsp;<i>if</i> needed <i>in</i> seen:</code></li>
            <li><code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>return</i> [seen[needed], index]</code></li>
            <li><code>&nbsp;&nbsp;&nbsp;&nbsp;seen[value] = index</code></li>
          </ol>
        </div>
        <div className="run-row">
          <span><b>✓</b> Accepted</span>
          <small>Runtime: 48 ms</small>
          <button type="button">Run code</button>
        </div>
        <div className="floating-card">
          <span className="pulse" /> Streak <b>12 days</b><strong>↗</strong>
        </div>
      </div>
    </section>
  );
}
