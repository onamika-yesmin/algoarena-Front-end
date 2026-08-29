"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listContests, createContest } from "@/lib/api/contests";
import type { ContestSummary } from "@/types/api";
import { getErrorMessage } from "@/lib/api/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

const statusLabel: Record<string, string> = { UPCOMING: "Upcoming", ONGOING: "Live now", ENDED: "Ended" };

const emptyForm = { title: "", slug: "", description: "", startTime: "", endTime: "" };

function AdminContestsContent() {
  const [contests, setContests] = useState<ContestSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    listContests({ limit: 50 })
      .then((result) => {
        setContests(result.items);
        setStatus("ready");
      })
      .catch((requestError) => {
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load contests."));
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

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
      setError(getErrorMessage(requestError, "Could not create the contest."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell
      eyebrow="COMPETITION / CONTESTS"
      title="Contest manager"
      description="Schedule a new contest. Attach problems afterward from the problem manager (contestId support is coming to that form)."
    >
      <div className="admin-card">
        <h2>Schedule a new contest</h2>
        <p className="admin-card-hint">Set the window now — you can attach problems once it exists.</p>
        <form className="admin-form" onSubmit={submit}>
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
      </div>

      <div className="admin-card">
        <h2>All contests</h2>
        {status === "loading" && <AdminTableSkeleton rows={4} />}
        {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={load} />}
        {status === "ready" && contests.length === 0 && <AdminEmptyState message="No contests yet — create the first one above." />}
        {status === "ready" && contests.length > 0 && (
          <div className="admin-table-wrap">
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
                    <td className="admin-cell-name">{contest.title}</td>
                    <td data-label="Status">
                      <span className={`pill pill-contest-${contest.status.toLowerCase()}`}>{statusLabel[contest.status] ?? contest.status}</span>
                    </td>
                    <td data-label="Problems">{contest.problemCount}</td>
                    <td data-label="Starts">{new Date(contest.startTime).toLocaleString()}</td>
                    <td className="admin-cell-actions">
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
      </div>
    </AdminShell>
  );
}

export default function AdminContestsPage() {
  return (
    <AdminRoute>
      <AdminContestsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
