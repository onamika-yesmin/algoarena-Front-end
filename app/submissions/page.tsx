"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listSubmissions } from "@/lib/api/submissions";
import type { Submission } from "@/types/api";

export default function SubmissionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("ready");
      return;
    }
    listSubmissions({ limit: 50 })
      .then((result) => {
        setSubmissions(result.items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [user, authLoading]);

  return (
    <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        SUBMISSIONS
      </p>
      <h1>Your submission history</h1>

      {!authLoading && !user && (
        <>
          <p>Sign in to see your submission history.</p>
          <Link className="button" href="/signin">
            Sign in <span aria-hidden="true">→</span>
          </Link>
        </>
      )}

      {user && status === "loading" && <p>Loading submissions…</p>}
      {user && status === "error" && <p>Could not load your submissions.</p>}
      {user && status === "ready" && submissions.length === 0 && (
        <>
          <p>Run a solution from a problem workspace to begin building your history.</p>
          <Link className="button" href="/problems">
            Browse problems <span aria-hidden="true">→</span>
          </Link>
        </>
      )}

      {user && submissions.length > 0 && (
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
    </main>
  );
}
