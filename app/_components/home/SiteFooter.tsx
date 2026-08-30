"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export function SiteFooter() {
  const { user, isLoading } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <Link className="brand" href="/"><i>{"</>"}</i> Algo<span>Arena</span></Link>
          <p>A home for developers who<br />enjoy the hard problems.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/problems">Problems</Link>
          <Link href="/contest">Contests</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/community">Community</Link>
        </div>
        <div>
          <h4>Practice</h4>
          <Link href="/interview">Mock interviews</Link>
          <Link href="/analytics">Your analytics</Link>
          <Link href="/submissions">Submission history</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link href="/signin">Sign in</Link>
          <Link href="/profile">My profile</Link>
          {!isLoading && user?.role === "admin" && <Link href="/admin">Admin dashboard</Link>}
        </div>
      </div>
      <div className="footer-bottom section-shell">
        <span>© {year} AlgoArena</span>
        <span>Built for curious minds.</span>
      </div>
    </footer>
  );
}
