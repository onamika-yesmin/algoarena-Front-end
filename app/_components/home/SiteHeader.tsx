import Link from "next/link";

const Arrow = () => <span aria-hidden="true">→</span>;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="AlgoArena home">
        <i>{"</>"}</i> Algo<span>Arena</span>
      </Link>
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
  );
}
