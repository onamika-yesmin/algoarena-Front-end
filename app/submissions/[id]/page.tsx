"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSubmissionById } from "@/lib/api/submissions";
import type { Submission } from "@/types/api";
import VerdictPanel from "@/components/verdict/VerdictPanel";

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    getSubmissionById(params.id)
      .then((data) => {
        if (!cancelled) {
          setSubmission(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (status === "loading") {
    return (
      <main className="section-shell workspace">
        <p>Loading submission…</p>
      </main>
    );
  }

  if (status === "error" || !submission) {
    return (
      <main className="section-shell workspace">
        <p>Could not load this submission — it may not exist, or you may not have access to it.</p>
        <Link className="text-link" href="/submissions">
          ← Back to submissions
        </Link>
      </main>
    );
  }

  return (
    <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        SUBMISSION
      </p>
      <h1>Submission detail</h1>
      <p>
        {submission.language} · submitted {new Date(submission.createdAt).toLocaleString()}
      </p>

      <div style={{ marginTop: 24 }}>
        <VerdictPanel submission={submission} />
      </div>

      <div className="output-panel" style={{ marginTop: 18 }}>
        <h4>Code</h4>
        <pre>{submission.code}</pre>
      </div>

      <Link className="text-link" href="/submissions" style={{ marginTop: 24, display: "inline-flex" }}>
        ← Back to submissions
      </Link>
    </main>
  );
}
