"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listContests, createContest } from "@/lib/api/contests";
import { listAdminProblems, type AdminProblemSummary } from "@/lib/api/admin";
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

  // Problem picker for the "Schedule a new contest" form. createContest()
  // has always accepted a `problems` array (contest.service.ts), but until
  // now nothing in the admin UI ever populated it — a contest could be
  // created but had no way to actually attach problems to it, so every new
  // contest stayed permanently empty ("No problems have been added to this
  // contest yet.") no matter how many times you filled out the form above.
  const [problems, setProblems] = useState<AdminProblemSummary[]>([]);
  const [problemsStatus, setProblemsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedPoints, setSelectedPoints] = useState<Record<string, number>>({});

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

  useEffect(() => {
    listAdminProblems({ limit: 100 })
      .then((result) => {
        setProblems(result.items);
        setProblemsStatus("ready");
      })
      .catch(() => setProblemsStatus("error"));
  }, []);

  const toggleProblem = (problem: AdminProblemSummary) => {
    setSelectedPoints((current) => {
      const next = { ...current };
      if (problem.id in next) {
        delete next[problem.id];
      } else {
        next[problem.id] = problem.basePoints || 100;
      }
      return next;
    });
  };

  const setProblemPoints = (problemId: string, points: number) => {
    setSelectedPoints((current) => ({ ...current, [problemId]: Number.isFinite(points) ? points : 0 }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const selectedProblems = Object.entries(selectedPoints).map(([problemId, points]) => ({ problemId, points }));
      await createContest({
        title: form.title.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        problems: selectedProblems.length ? selectedProblems : undefined,
      });
      setForm(emptyForm);
      setSelectedPoints({});
      setSuccess(`Contest created${selectedProblems.length ? ` with ${selectedProblems.length} problem${selectedProblems.length === 1 ? "" : "s"}` : ""}.`);
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
      description="Schedule a new contest and pick which problems belong to it — everything in one step."
    >
      <div className="admin-card">
        <h2>Schedule a new contest</h2>
        <p className="admin-card-hint">Set the window and select problems now — you can still register/view it right after creating.</p>
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

          <label>
            Problems ({Object.keys(selectedPoints).length} selected)
            {problemsStatus === "loading" && <span className="admin-cell-sub">Loading problems…</span>}
            {problemsStatus === "error" && <span className="form-error">Could not load the problem list.</span>}
            {problemsStatus === "ready" && problems.length === 0 && (
              <span className="admin-cell-sub">
                No problems yet — create some in <Link className="text-link" href="/admin/problems/new">Problem manager</Link> first.
              </span>
            )}
            {problemsStatus === "ready" && problems.length > 0 && (
              <div className="contest-problem-picker">
                {problems.map((problem) => {
                  const isSelected = problem.id in selectedPoints;
                  return (
                    <div key={problem.id} className="contest-problem-row">
                      <label className="contest-problem-checkbox">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleProblem(problem)} />
                        <span>{problem.title}</span>
                        <span className={`pill pill-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                        <span className={`badge ${problem.isPublished ? "badge-published" : "badge-draft"}`}>
                          {problem.isPublished ? "Published" : "Draft"}
                        </span>
                      </label>
                      {isSelected && (
                        <input
                          type="number"
                          min={1}
                          className="contest-problem-points"
                          value={selectedPoints[problem.id]}
                          onChange={(event) => setProblemPoints(problem.id, Number(event.target.value))}
                          aria-label={`Points for ${problem.title}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </label>
          <p className="admin-card-hint" style={{ marginTop: -8 }}>
            A draft (unpublished) problem can be attached now and published right when the contest starts, so it isn&apos;t solvable early.
          </p>

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
