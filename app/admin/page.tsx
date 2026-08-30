"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAdminStats } from "@/lib/api/admin";
import type { AdminStats } from "@/types/api";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminStatSkeleton } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { getErrorMessage } from "@/lib/api/client";
import { IconUsers, IconCode, IconTrophy, IconGrid } from "@/components/admin/icons";

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    getAdminStats()
      .then((result) => {
        setStats(result);
        setStatus("ready");
      })
      .catch((error) => {
        setErrorMessage(getErrorMessage(error, "Could not load platform stats."));
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  return (
    <AdminShell
      eyebrow="CONTROL ROOM"
      title="Admin dashboard"
      description="Monitor the arena and keep the learner experience healthy."
      actions={
        <Link className="button button-small" href="/admin/problems/new">
          New problem <span>→</span>
        </Link>
      }
    >
      {status === "loading" && <AdminStatSkeleton />}
      {status === "error" && <AdminErrorState message={errorMessage} onRetry={load} />}

      {status === "ready" && stats && (
        <section className="stat-card-grid">
          <article className="stat-card">
            <span className="stat-card-icon"><IconUsers /></span>
            <b>{stats.totalUsers}</b>
            <span>Total learners</span>
            <small>{stats.blockedUsers} blocked</small>
          </article>
          <article className="stat-card accent-cyan">
            <span className="stat-card-icon"><IconCode /></span>
            <b>{stats.totalProblems}</b>
            <span>Problems in library</span>
          </article>
          <article className="stat-card accent-orange">
            <span className="stat-card-icon"><IconGrid /></span>
            <b>{stats.submissionsToday}</b>
            <span>Submissions today</span>
            <small>{stats.totalSubmissions} all-time</small>
          </article>
          <article className="stat-card">
            <span className="stat-card-icon"><IconTrophy /></span>
            <b>{stats.activeContests}</b>
            <span>Active/upcoming contests</span>
          </article>
        </section>
      )}

      <section className="admin-link-grid">
        <article className="admin-link-card">
          <span className="panel-kicker"><IconUsers /> PEOPLE</span>
          <h2>User control</h2>
          <p>Review account status, promote moderators, and block bad actors.</p>
          <Link className="text-link" href="/admin/users">
            Open user manager →
          </Link>
        </article>
        <article className="admin-link-card">
          <span className="panel-kicker"><IconCode /> CONTENT</span>
          <h2>Problem library</h2>
          <p>Create, edit, publish and remove challenge content.</p>
          <Link className="text-link" href="/admin/problems">
            Open problem manager →
          </Link>
        </article>
        <article className="admin-link-card">
          <span className="panel-kicker"><IconTrophy /> COMPETITION</span>
          <h2>Contests</h2>
          <p>Schedule new contests and attach problems to them.</p>
          <Link className="text-link" href="/admin/contests">
            Open contest manager →
          </Link>
        </article>
        <article className="admin-link-card">
          <span className="panel-kicker"><IconGrid /> QUALITY</span>
          <h2>Judge health</h2>
          <p>
            {stats ? `${stats.acceptedSubmissions} of ${stats.totalSubmissions} submissions accepted.` : "Loading acceptance rate…"}
          </p>
          <Link className="text-link" href="/leaderboard">
            View leaderboard →
          </Link>
        </article>
      </section>
    </AdminShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
      <SiteFooter />
    </AdminRoute>
  );
}
