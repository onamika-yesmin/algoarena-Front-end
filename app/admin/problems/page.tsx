"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteAdminProblem, listAdminProblems, updateAdminProblem, type AdminProblemSummary } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function AdminProblemsContent() {
  const [problems, setProblems] = useState<AdminProblemSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    listAdminProblems({ search: search || undefined, limit: 100 })
      .then((result) => {
        setProblems(result.items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const togglePublished = async (problem: AdminProblemSummary) => {
    setBusyId(problem.id);
    setError(null);
    try {
      await updateAdminProblem(problem.id, { isPublished: !problem.isPublished });
      setProblems((current) => current.map((item) => (item.id === problem.id ? { ...item, isPublished: !item.isPublished } : item)));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not update the problem.");
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
      setError(requestError instanceof ApiError ? requestError.message : "Could not delete the problem.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">CONTENT / PROBLEMS</p>
          <h1>Problem manager</h1>
          <p>Create, edit, publish and remove problems from the library.</p>
        </div>
        <Link className="button button-small" href="/admin/problems/new">
          New problem <span>→</span>
        </Link>
      </div>

      <div className="admin-toolbar">
        <input placeholder="Search by title…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search problems" />
        <Link className="text-link" href="/admin">
          ← Back to dashboard
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {status === "loading" && <Loader label="Loading problems…" />}
      {status === "error" && <p className="problem-list-status">Could not load problems.</p>}
      {status === "ready" && problems.length === 0 && <p className="problem-list-status">No problems yet — create the first one.</p>}

      {status === "ready" && problems.length > 0 && (
        <div className="admin-table-wrap submission-history">
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
                  <td>{problem.title}</td>
                  <td>{problem.difficulty}</td>
                  <td>{problem.basePoints}</td>
                  <td>
                    <span className={`badge ${problem.isPublished ? "badge-published" : "badge-draft"}`}>
                      {problem.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
    </main>
  );
}

export default function AdminProblemsPage() {
  return (
    <AdminRoute>
      <SiteHeader />
      <AdminProblemsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
