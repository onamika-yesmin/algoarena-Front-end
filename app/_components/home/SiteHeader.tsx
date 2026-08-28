"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

const Arrow = () => <span aria-hidden="true">→</span>;

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
      window.location.assign("/");
    }
  };

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="AlgoArena home">
        <i>{"</>"}</i> Algo<span>Arena</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/problems">Problems</Link>
        <Link href="/contest">Contests</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        {!isLoading && user && <Link href="/analytics">Analytics</Link>}
        {!isLoading && user?.role === "admin" && (
          <Link href="/admin" className="admin-nav-link">
            Admin
          </Link>
        )}
      </nav>
      <div className="header-actions">
        {!isLoading && user ? (
          <div className="header-account">
            <Link className="header-avatar-link" href="/profile" aria-label="Your profile">
              {user.profilePicUrl ? (
                <Image
                  className="header-avatar"
                  src={user.profilePicUrl}
                  alt={`${user.name} profile`}
                  width={36}
                  height={36}
                />
              ) : (
                <span className="header-avatar header-avatar-fallback">{user.name.slice(0, 1).toUpperCase()}</span>
              )}
              <span className="header-account-name">{user.name}</span>
              {user.role === "admin" && <span className="header-role-badge">Admin</span>}
            </Link>
            <button className="sign-in header-signout" type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <>
            <Link className="sign-in" href="/signin">Sign in</Link>
            <Link className="button button-small" href="/problems">Start coding <Arrow /></Link>
          </>
        )}
      </div>
    </header>
  );
}
