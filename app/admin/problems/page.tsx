"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { deleteAdminProblem, listAdminProblems, updateAdminProblem, type AdminProblemSummary } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { IconSearch } from "@/components/admin/icons";
import { PageLoader } from "@/components/ui/Loader";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

// "?page=3" → 3; a missing or malformed value → page 1.
const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

function AdminProblemsContent() {
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const [problems, setProblems] = useState<AdminProblemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only the most recent load's response is applied, so a slower response
  // for an older search or page can't overwrite newer results.
  const latestRequestRef = useRef(0);
  // The search text the last load used — only a change to it waits out the
  // typing debounce; a page change or a post-action reload loads right away.
  const loadedSearchRef = useRef(search);

  // The page lives in the URL (?page=3) so a refresh, or coming back from the
  // edit screen, lands on the same page. Next.js syncs History API updates
  // into useSearchParams without a server round trip. "replace" is for
  // corrections (search reset, stepping back off an emptied page) that
  // shouldn't leave a history entry.
  const goToPage = useCallback((nextPage: number, mode: "push" | "replace" = "push") => {
    const url = new URL(window.location.href);
    if (nextPage > 1) url.searchParams.set("page", String(nextPage));
    else url.searchParams.delete("page");
    if (url.href === window.location.href) return;
    const target = `${url.pathname}${url.search}${url.hash}`;
    if (mode === "push") window.history.pushState(null, "", target);
    else window.history.replaceState(null, "", target);
  }, []);

  // `silent` keeps the current rows on screen (no skeleton) — used to refresh
  // the page after an action changed the list.
  const load = useCallback(
    ({ silent = false }: { silent?: boolean } = {}) => {
      const requestId = ++latestRequestRef.current;
      loadedSearchRef.current = search;
      if (!silent) setStatus("loading");
      return listAdminProblems({ search: search || undefined, page, limit: PAGE_SIZE })
        .then((result) => {
          if (requestId !== latestRequestRef.current) return;
          // Past the last page — its last problem was just deleted, or the URL
          // has a stale ?page= — so step back rather than show an empty table.
          if (result.items.length === 0 && result.total > 0 && page > 1) {
            setStatus("loading");
            goToPage(Math.min(page - 1, Math.ceil(result.total / PAGE_SIZE)), "replace");
            return;
          }
          setProblems(result.items);
          setTotal(result.total);
          setStatus("ready");
        })
        .catch((requestError) => {
          if (requestId !== latestRequestRef.current) return;
          setLoadErrorMessage(getErrorMessage(requestError, "Could not load problems."));
          setStatus("error");
        });
    },
    [search, page, goToPage],
  );

  useEffect(() => {
    const timeout = setTimeout(() => load(), loadedSearchRef.current === search ? 0 : 250);
    return () => clearTimeout(timeout);
  }, [load, search]);

  const changeSearch = (value: string) => {
    setSearch(value);
    goToPage(1, "replace");
  };

  const togglePublished = async (problem: AdminProblemSummary) => {
    setBusyId(problem.id);
    setError(null);
    try {
      await updateAdminProblem(problem.id, { isPublished: !problem.isPublished });
      setProblems((current) => current.map((item) => (item.id === problem.id ? { ...item, isPublished: !item.isPublished } : item)));
      await load({ silent: true });
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
      // The row stays (disabled) until the refreshed page arrives, so the next
      // problem slides in and an emptied page steps back without a flash.
      await load({ silent: true });
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
          <input placeholder="Search by title…" value={search} onChange={(event) => changeSearch(event.target.value)} aria-label="Search problems" />
        </div>
        {status === "ready" && (
          <span className="admin-toolbar-count">
            {total} {total === 1 ? "problem" : "problems"}
          </span>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {status === "loading" && <AdminTableSkeleton rows={6} />}
      {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={() => load()} />}
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

      {status !== "error" && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(nextPage) => goToPage(nextPage)} itemLabel="problems" disabled={status === "loading" || busyId !== null} />
      )}
    </AdminShell>
  );
}

export default function AdminProblemsPage() {
  return (
    <AdminRoute>
      {/* useSearchParams (the ?page= above) needs a Suspense boundary for static prerendering. */}
      <Suspense fallback={<PageLoader label="Loading problems…" />}>
        <AdminProblemsContent />
      </Suspense>
      <SiteFooter />
    </AdminRoute>
  );
}
