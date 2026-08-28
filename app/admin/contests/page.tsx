"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listContests, createContest } from "@/lib/api/contests";
import type { ContestSummary } from "@/types/api";
import { ApiError } from "@/lib/api/client";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

const statusLabel: Record<string, string> = { UPCOMING: "Upcoming", ONGOING: "Live now", ENDED: "Ended" };

const emptyForm = { title: "", slug: "", description: "", startTime: "", endTime: "" };

function AdminContestsContent() {
  const [contests, setContests] = useState<ContestSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    listContests({ limit: 50 })
      .then((result) => {
        setContests(result.items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(load, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createContest({
        title: form.title.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      setForm(emptyForm);
      setSuccess("Contest created.");
      load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not create the contest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">COMPETITION / CONTESTS</p>
          <h1>Contest manager</h1>
          <p>Schedule a new contest. Attach problems afterward from the problem manager (contestId support is coming to that form).</p>
        </div>
        <Link className="text-link" href="/admin">
          ← Back to dashboard
        </Link>
      </div>

      <form className="admin-form" onSubmit={submit} style={{ marginBottom: 48 }}>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <div className="admin-form-row">
          <label>
            Title
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            Slug
            <input required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="weekly-challenge-1" />
          </label>
        </div>
        <label>
          Description
          <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="admin-form-row">
          <label>
            Starts
            <input required type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
          </label>
          <label>
            Ends
            <input required type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="button button-small" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create contest"}
          </button>
        </div>
      </form>

      <h2 style={{ font: "700 22px 'Space Grotesk'", margin: "0 0 16px" }}>All contests</h2>
      {status === "loading" && <Loader label="Loading contests…" />}
      {status === "error" && <p className="problem-list-status">Could not load contests.</p>}
      {status === "ready" && contests.length === 0 && <p className="problem-list-status">No contests yet — create the first one above.</p>}
      {status === "ready" && contests.length > 0 && (
        <div className="admin-table-wrap submission-history">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Problems</th>
                <th>Starts</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => (
                <tr key={contest.id}>
                  <td>{contest.title}</td>
                  <td>
                    <span className={`pill pill-contest-${contest.status.toLowerCase()}`}>{statusLabel[contest.status] ?? contest.status}</span>
                  </td>
                  <td>{contest.problemCount}</td>
                  <td>{new Date(contest.startTime).toLocaleString()}</td>
                  <td>
                    <Link className="icon-button" href={`/contest/${contest.slug}`}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function AdminContestsPage() {
  return (
    <AdminRoute>
      <SiteHeader />
      <AdminContestsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
