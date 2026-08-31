"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSubmissionById } from "@/lib/api/submissions";
import type { Submission } from "@/types/api";
import VerdictPanel from "@/components/verdict/VerdictPanel";
import ComplexityAuditorPanel from "@/components/complexity/ComplexityAuditorPanel";
import RefactorPanel from "@/components/refactor/RefactorPanel";
import { PageLoader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function SubmissionDetailContent() {
  const params = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getSubmissionById(params.id)
      .then((data) => {
        if (!cancelled) {
          setSubmission(data);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load this submission — it may not exist, or you may not have access to it."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (status === "loading") {
    return <PageLoader label="Loading submission…" />;
  }

  if (status === "error" || !submission) {
    return (
      <main className="section-shell workspace">
        <p>{errorMessage}</p>
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

      <ComplexityAuditorPanel key={submission.id} submissionId={submission.id} initialReport={submission.complexityReport} />

      {submission.verdict === "ACCEPTED" && (
        <RefactorPanel
          key={submission.id}
          submissionId={submission.id}
          language={submission.language}
          originalCode={submission.code}
          initialSuggestions={submission.refactorSuggestions}
        />
      )}

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

export default function SubmissionDetailPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <SubmissionDetailContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
