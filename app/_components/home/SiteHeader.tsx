"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

const Arrow = () => <span aria-hidden="true">→</span>;

interface NavLink {
  href: string;
  label: string;
}

const PRIMARY_LINKS: NavLink[] = [
  { href: "/problems", label: "Problems" },
  { href: "/contest", label: "Contests" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/community", label: "Community" },
];

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // A signed-in user unlocks a couple of extra links; admins get one more on
  // top of that. Computed once per render so both the desktop nav and the
  // mobile drawer stay in sync from a single source of truth.
  const signedInLinks: NavLink[] = !isLoading && user ? [{ href: "/analytics", label: "Analytics" }, { href: "/interview", label: "Interview" }] : [];
  const adminLink: NavLink | null = !isLoading && user?.role === "admin" ? { href: "/admin", label: "Admin" } : null;
  const allLinks = [...PRIMARY_LINKS, ...signedInLinks, ...(adminLink ? [adminLink] : [])];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  // Close the mobile drawer automatically on navigation, and give the header
  // a subtle shadow once the page has scrolled — both small touches that
  // make the sticky header feel considered rather than just pinned in place.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <header className={`site-header${isScrolled ? " is-scrolled" : ""}`}>
      <Link className="brand" href="/" aria-label="AlgoArena home">
        <i>{"</>"}</i> Algo<span>Arena</span>
      </Link>
      <nav aria-label="Primary navigation">
        {PRIMARY_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={isActive(link.href) ? "is-active" : undefined}>
            {link.label}
          </Link>
        ))}
        {signedInLinks.map((link) => (
          <Link key={link.href} href={link.href} className={isActive(link.href) ? "is-active" : undefined}>
            {link.label}
          </Link>
        ))}
        {adminLink && (
          <Link href={adminLink.href} className={`admin-nav-link${isActive(adminLink.href) ? " is-active" : ""}`}>
            {adminLink.label}
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
        <button
          type="button"
          className={`nav-toggle${isMenuOpen ? " is-open" : ""}`}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </div>
      <div id="mobile-nav" className={`mobile-nav${isMenuOpen ? " is-open" : ""}`}>
        <nav aria-label="Mobile navigation">
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href} className={isActive(link.href) ? "is-active" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-nav-actions">
          {!isLoading && user ? (
            <>
              <Link href="/profile" className="mobile-nav-account">
                {user.profilePicUrl ? (
                  <Image className="header-avatar" src={user.profilePicUrl} alt="" width={32} height={32} />
                ) : (
                  <span className="header-avatar header-avatar-fallback">{user.name.slice(0, 1).toUpperCase()}</span>
                )}
                <span>{user.name}</span>
                {user.role === "admin" && <span className="header-role-badge">Admin</span>}
              </Link>
              <button className="button-outline" type="button" onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link className="button-outline" href="/signin">Sign in</Link>
              <Link className="button" href="/problems">Start coding <Arrow /></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
