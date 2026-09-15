"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listSubmissions } from "@/lib/api/submissions";
import type { Submission } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { Pagination } from "@/components/ui/Pagination";
import { getErrorMessage } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

const PAGE_SIZE = 20;

// "?page=3" → 3; a missing or malformed value → page 1.
const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

function SubmissionsContent() {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Only the most recent load's response is applied, so quickly paging
  // through can't leave an older page's rows on screen.
  const latestRequestRef = useRef(0);

  // The page lives in the URL (?page=3) so a refresh, or coming back from a
  // submission's detail page, lands on the same page. Next.js syncs History
  // API updates into useSearchParams without a server round trip.
  const goToPage = useCallback((nextPage: number, mode: "push" | "replace" = "push") => {
    const url = new URL(window.location.href);
    if (nextPage > 1) url.searchParams.set("page", String(nextPage));
    else url.searchParams.delete("page");
    if (url.href === window.location.href) return;
    const target = `${url.pathname}${url.search}${url.hash}`;
    if (mode === "push") window.history.pushState(null, "", target);
    else window.history.replaceState(null, "", target);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    const requestId = ++latestRequestRef.current;
    setStatus("loading");
    listSubmissions({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (requestId !== latestRequestRef.current) return;
        // A stale ?page= past the last page steps back instead of showing
        // the "no history yet" state to someone who has submissions.
        if (result.items.length === 0 && result.total > 0 && page > 1) {
          goToPage(Math.min(page - 1, Math.ceil(result.total / PAGE_SIZE)), "replace");
          return;
        }
        setSubmissions(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch((error) => {
        if (requestId !== latestRequestRef.current) return;
        setErrorMessage(getErrorMessage(error, "Could not load your submissions."));
        setStatus("error");
      });
  }, [isSignedIn, page, goToPage]);

  return (
    <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        SUBMISSIONS
      </p>
      <h1>Your submission history</h1>
      {status === "ready" && total > 0 && (
        <p style={{ margin: "8px 0 0", color: "#9da5bf" }}>
          {total} {total === 1 ? "submission" : "submissions"}
        </p>
      )}

      {status === "loading" && <Loader label="Loading submissions…" />}
      {status === "error" && <p className="problem-list-status">{errorMessage}</p>}
      {status === "ready" && submissions.length === 0 && (
        <>
          <p>Run a solution from a problem workspace to begin building your history.</p>
          <Link className="button" href="/problems">
            Browse problems <span aria-hidden="true">→</span>
          </Link>
        </>
      )}

      {status === "ready" && submissions.length > 0 && (
        <div className="submission-history" style={{ marginTop: 28 }}>
          <table>
            <thead>
              <tr>
                <th>Verdict</th>
                <th>Tests</th>
                <th>Score</th>
                <th>Language</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{submission.verdict}</td>
                  <td>
                    {submission.passedTests}/{submission.totalTests}
                  </td>
                  <td>{submission.score}</td>
                  <td>{submission.language}</td>
                  <td>{new Date(submission.createdAt).toLocaleString()}</td>
                  <td>
                    <Link className="text-link" href={`/submissions/${submission.id}`}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status !== "error" && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(nextPage) => goToPage(nextPage)} itemLabel="submissions" disabled={status === "loading"} />
      )}
    </main>
  );
}

export default function SubmissionsPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      {/* useSearchParams (the ?page= above) needs a Suspense boundary for static prerendering. */}
      <Suspense fallback={<Loader label="Loading submissions…" />}>
        <SubmissionsContent />
      </Suspense>
      <SiteFooter />
    </ProtectedRoute>
  );
}
