"use client";

import Link from "next/link";

const Arrow = () => <span aria-hidden="true">→</span>;

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="AlgoArena home"><i>{"</>"}</i> Algo<span>Arena</span></Link>
        <nav aria-label="Primary navigation">
          <Link href="/problems">Problems</Link>
          <Link href="/contest">Contests</Link>
          <Link href="/leaderboard">Leaderboard</Link>
        </nav>
        <div className="header-actions">
          <Link className="sign-in" href="/signin">Sign in</Link>
          <Link className="button button-small" href="/problems">Start coding <Arrow /></Link>
        </div>
      </header>

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

      <section className="feature-band"><div className="section-shell stat-grid">
        <div><span>01</span><h2>Practice with purpose</h2><p>Curated paths that make every challenge count.</p></div>
        <div><span>02</span><h2>Compete in real time</h2><p>Weekly contests and a leaderboard that stays alive.</p></div>
        <div><span>03</span><h2>Learn from the code</h2><p>Clear feedback to help you improve with intent.</p></div>
      </div></section>

      <section className="paths section-shell">
        <div className="section-intro"><p className="eyebrow">FIND YOUR FLOW</p><h2>One arena. Every way<br />you want to grow.</h2><Link className="text-link" href="/problems">Browse all tracks <Arrow /></Link></div>
        <div className="path-grid">
          <article className="path-card purple"><span>01 / PRACTISE</span><h3>Master the<br />fundamentals.</h3><p>Build confidence, one thoughtful problem at a time.</p><Link href="/problems">Start practising <Arrow /></Link><div className="card-icon">⌘</div></article>
          <article className="path-card cyan"><span>02 / COMPETE</span><h3>Feel the<br />countdown.</h3><p>Test your instincts in contests built for momentum.</p><Link href="/contest">See contests <Arrow /></Link><div className="card-icon">◴</div></article>
          <article className="path-card orange"><span>03 / CONNECT</span><h3>Grow with<br />your peers.</h3><p>Share solutions, gain perspective, and keep moving.</p><Link href="/leaderboard">Meet the community <Arrow /></Link><div className="card-icon">◎</div></article>
        </div>
      </section>

      <section className="cta section-shell"><p className="eyebrow">THE ARENA IS OPEN</p><h2>Ready to make your<br /><em>next solution count?</em></h2><Link className="button" href="/problems">Enter AlgoArena <Arrow /></Link></section>

      <footer><div className="footer-main section-shell"><Link className="brand" href="/"><i>{"</>"}</i> Algo<span>Arena</span></Link><p>A home for developers who<br />enjoy the hard problems.</p><div><h4>Explore</h4><Link href="/problems">Problems</Link><Link href="/contest">Contests</Link><Link href="/leaderboard">Leaderboard</Link></div><div><h4>Account</h4><Link href="/signin">Sign in</Link><Link href="/profile">My profile</Link></div></div><div className="footer-bottom section-shell"><span>© 2026 AlgoArena</span><span>Built for curious minds.</span></div></footer>
    </main>
  );
}
