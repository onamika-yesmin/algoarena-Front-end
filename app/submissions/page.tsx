"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listSubmissions } from "@/lib/api/submissions";
import type { Submission } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function SubmissionsContent() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!user) return;
    listSubmissions({ limit: 50 })
      .then((result) => {
        setSubmissions(result.items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [user]);

  return (
    <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        SUBMISSIONS
      </p>
      <h1>Your submission history</h1>

      {status === "loading" && <Loader label="Loading submissions…" />}
      {status === "error" && <p className="problem-list-status">Could not load your submissions.</p>}
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
    </main>
  );
}

export default function SubmissionsPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <SubmissionsContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
