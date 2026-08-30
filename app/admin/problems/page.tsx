"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { deleteAdminProblem, listAdminProblems, updateAdminProblem, type AdminProblemSummary } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { IconSearch } from "@/components/admin/icons";

function AdminProblemsContent() {
  const [problems, setProblems] = useState<AdminProblemSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    listAdminProblems({ search: search || undefined, limit: 100 })
      .then((result) => {
        setProblems(result.items);
        setStatus("ready");
      })
      .catch((requestError) => {
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load problems."));
        setStatus("error");
      });
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const togglePublished = async (problem: AdminProblemSummary) => {
    setBusyId(problem.id);
    setError(null);
    try {
      await updateAdminProblem(problem.id, { isPublished: !problem.isPublished });
      setProblems((current) => current.map((item) => (item.id === problem.id ? { ...item, isPublished: !item.isPublished } : item)));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update the problem."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (problem: AdminProblemSummary) => {
    if (!window.confirm(`Delete "${problem.title}"? This also removes its test cases and cannot be undone.`)) return;
    setBusyId(problem.id);
    setError(null);
    try {
      await deleteAdminProblem(problem.id);
      setProblems((current) => current.filter((item) => item.id !== problem.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete the problem."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell
      eyebrow="CONTENT / PROBLEMS"
      title="Problem manager"
      description="Create, edit, publish and remove problems from the library."
      actions={
        <Link className="button button-small" href="/admin/problems/new">
          New problem <span>→</span>
        </Link>
      }
    >
      <div className="admin-toolbar">
        <div className="admin-toolbar-search">
          <IconSearch />
          <input placeholder="Search by title…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search problems" />
        </div>
        {status === "ready" && (
          <span className="admin-toolbar-count">{problems.length} {problems.length === 1 ? "problem" : "problems"}</span>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {status === "loading" && <AdminTableSkeleton rows={6} />}
      {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={load} />}
      {status === "ready" && problems.length === 0 && <AdminEmptyState message="No problems yet — create the first one." />}

      {status === "ready" && problems.length > 0 && (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Points</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem.id}>
                  <td className="admin-cell-name">{problem.title}</td>
                  <td data-label="Difficulty">
                    <span className={`pill pill-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  </td>
                  <td data-label="Points">{problem.basePoints}</td>
                  <td data-label="Status">
                    <span className={`badge ${problem.isPublished ? "badge-published" : "badge-draft"}`}>
                      {problem.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="admin-cell-actions">
                    <Link className="icon-button" href={`/admin/problems/${problem.id}/edit`}>
                      Edit
                    </Link>
                    <button type="button" className="icon-button" disabled={busyId === problem.id} onClick={() => togglePublished(problem)}>
                      {problem.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button type="button" className="icon-button icon-button-danger" disabled={busyId === problem.id} onClick={() => remove(problem)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminProblemsPage() {
  return (
    <AdminRoute>
      <AdminProblemsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
