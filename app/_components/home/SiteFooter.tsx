"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function SiteFooter() {
  const { user, isLoading } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <BrandLogo size="lg" />
          <p>
            A practice arena for people who like the hard problems — a real judge, an AI coach and a scoreboard, free
            for everyone.
          </p>
          <Link className="button button-small" href="/problems">
            Start solving <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/problems">Problems</Link>
          <Link href="/contest">Contests</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/community">Community</Link>
          <Link href="/kids">Kids zone</Link>
        </div>
        <div>
          <h2>Practice</h2>
          <Link href="/interview">Mock interviews</Link>
          <Link href="/analytics">Your analytics</Link>
          <Link href="/submissions">Submission history</Link>
        </div>
        <div>
          <h2>Account</h2>
          <Link href="/signin">Sign in</Link>
          <Link href="/profile">My profile</Link>
          {!isLoading && user?.role === "admin" && <Link href="/admin">Admin dashboard</Link>}
          {!isLoading && user?.role === "guest" && <Link href="/admin/contests">Host panel</Link>}
          {!isLoading && user?.role !== "admin" && user?.role !== "guest" && <Link href="/host">Host a contest</Link>}
        </div>
      </div>
      <div className="footer-bottom section-shell">
        <span>© {year} AlgoArena</span>
        <span>Built for curious minds.</span>
      </div>
    </footer>
  );
}
