import Link from "next/link";

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-main section-shell">
        <Link className="brand" href="/"><i>{"</>"}</i> Algo<span>Arena</span></Link>
        <p>A home for developers who<br />enjoy the hard problems.</p>
        <div><h4>Explore</h4><Link href="/problems">Problems</Link><Link href="/contest">Contests</Link><Link href="/leaderboard">Leaderboard</Link></div>
        <div><h4>Account</h4><Link href="/signin">Sign in</Link><Link href="/profile">My profile</Link></div>
      </div>
      <div className="footer-bottom section-shell"><span>© 2026 AlgoArena</span><span>Built for curious minds.</span></div>
    </footer>
  );
}
