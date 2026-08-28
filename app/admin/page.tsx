"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/api/admin";
import type { AdminStats } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    getAdminStats()
      .then((result) => {
        setStats(result);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">CONTROL ROOM</p>
          <h1>Admin dashboard</h1>
          <p>Monitor the arena and keep the learner experience healthy.</p>
        </div>
        <Link className="button button-small" href="/admin/problems">
          Manage problems <span>→</span>
        </Link>
      </div>

      {status === "loading" && <Loader label="Loading platform stats…" />}
      {status === "error" && <p className="problem-list-status">Could not load stats.</p>}

      {status === "ready" && stats && (
        <section className="metric-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <article>
            <b>{stats.totalUsers}</b>
            <span>Total learners</span>
            <small>{stats.blockedUsers} blocked</small>
          </article>
          <article>
            <b>{stats.totalProblems}</b>
            <span>Problems in library</span>
          </article>
          <article>
            <b>{stats.submissionsToday}</b>
            <span>Submissions today</span>
            <small>{stats.totalSubmissions} all-time</small>
          </article>
          <article>
            <b>{stats.activeContests}</b>
            <span>Active/upcoming contests</span>
          </article>
        </section>
      )}

      <section className="admin-grid">
        <article className="admin-panel">
          <span className="panel-kicker">PEOPLE</span>
          <h2>User control</h2>
          <p>Review account status, promote moderators, and block bad actors.</p>
          <Link className="text-link" href="/admin/users">
            Open user manager →
          </Link>
        </article>
        <article className="admin-panel">
          <span className="panel-kicker">CONTENT</span>
          <h2>Problem library</h2>
          <p>Create, edit, publish and remove challenge content.</p>
          <Link className="text-link" href="/admin/problems">
            Open problem manager →
          </Link>
        </article>
        <article className="admin-panel">
          <span className="panel-kicker">COMPETITION</span>
          <h2>Contests</h2>
          <p>Schedule new contests and attach problems to them.</p>
          <Link className="text-link" href="/admin/contests">
            Open contest manager →
          </Link>
        </article>
        <article className="admin-panel">
          <span className="panel-kicker">QUALITY</span>
          <h2>Judge health</h2>
          <p>
            {stats ? `${stats.acceptedSubmissions} of ${stats.totalSubmissions} submissions accepted.` : "Loading acceptance rate…"}
          </p>
          <Link className="text-link" href="/leaderboard">
            View leaderboard →
          </Link>
        </article>
      </section>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminRoute>
      <SiteHeader />
      <AdminDashboardContent />
      <SiteFooter />
    </AdminRoute>
  );
}
