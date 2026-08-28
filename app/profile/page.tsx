"use client";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "../_components/home/SiteHeader";
import { SiteFooter } from "../_components/home/SiteFooter";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfilePage() {
  // Reuses the shared, Bearer-token-aware auth session instead of a
  // duplicate raw fetch — this is what the httpOnly-cookie-only version of
  // this page was missing, and why it could show "Authentication is
  // required" even right after a successful login on browsers that block
  // the cross-site cookie. See lib/api/client.ts and lib/auth-storage.ts.
  const { user, isLoading } = useAuth();

  return (
    <>
      <SiteHeader />
      <main className="dashboard-shell">
        <div className="dashboard-head">
          <div>
            <p className="eyebrow">YOUR ARENA / PROFILE</p>
            <h1>Profile & progress</h1>
            <p>Keep your identity, streak and learning goals in one place.</p>
          </div>
          <Link className="button button-small" href="/problems">Continue solving <span>→</span></Link>
        </div>
        {user ? (
          <>
            <section className="profile-card profile-hero">
              <div className="avatar">
                {user.profilePicUrl ? (
                  <Image src={user.profilePicUrl} alt={`${user.name} profile`} width={112} height={112} priority />
                ) : (
                  user.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="profile-identity">
                <span className="panel-kicker">CODER PROFILE</span>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <span className="status-pill">● {user.status} · {user.role}</span>
              </div>
              <div className="profile-actions">
                <Link className="button button-small" href="/submissions">View submissions</Link>
                <Link className="text-link" href="/analytics">Open analytics →</Link>
              </div>
            </section>
            <section className="metric-grid">
              <article><b>0</b><span>Problems solved</span><small>Start your first challenge</small></article>
              <article><b>0 days</b><span>Current streak</span><small>Consistency compounds</small></article>
              <article><b>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</b><span>Member since</span><small>Welcome to AlgoArena</small></article>
            </section>
            <section className="profile-columns">
              <article className="profile-panel">
                <span className="panel-kicker">NEXT MOVE</span>
                <h2>Build your solving rhythm.</h2>
                <p>Choose a problem, submit an approach and use every result as feedback.</p>
                <Link className="text-link" href="/problems">Browse problem library →</Link>
              </article>
              <article className="profile-panel">
                <span className="panel-kicker">ACCOUNT</span>
                <div className="detail-row"><span>Account status</span><strong>{user.status}</strong></div>
                <div className="detail-row"><span>Access level</span><strong>{user.role}</strong></div>
                <div className="detail-row"><span>Profile email</span><strong>{user.email}</strong></div>
              </article>
            </section>
          </>
        ) : (
          <div className="empty-panel">
            {isLoading ? "Loading your profile…" : "Please sign in to view your profile."}
            <Link href="/signin">Sign in to continue →</Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
