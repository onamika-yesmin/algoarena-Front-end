"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminProblem, updateAdminProblem, type AdminProblemDetail } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { ProblemForm, type ProblemFormValues } from "@/components/admin/ProblemForm";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function EditProblemContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [problem, setProblem] = useState<AdminProblemDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminProblem(params.id)
      .then((data) => {
        setProblem(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [params.id]);

  const submit = async (values: ProblemFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const tags = values.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      await updateAdminProblem(params.id, {
        slug: values.slug.trim().toLowerCase(),
        title: values.title.trim(),
        statement: values.statement,
        inputFormat: values.inputFormat,
        outputFormat: values.outputFormat,
        constraints: values.constraints,
        difficulty: values.difficulty,
        tags,
        timeLimitMs: values.timeLimitMs,
        memoryLimitMb: values.memoryLimitMb,
        basePoints: values.basePoints,
        isPublished: values.isPublished,
        sampleTests: values.testCases
          .filter((testCase) => testCase.isSample && (testCase.input.trim() || testCase.expectedOutput.trim()))
          .map(({ input, expectedOutput, explanation }) => ({ input, expectedOutput, explanation })),
        starterCode: values.starterCode,
      });
      router.push("/admin/problems");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not update the problem.");
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return <Loader label="Loading problem…" />;
  if (status === "error" || !problem) {
    return (
      <main className="dashboard-shell">
        <p className="problem-list-status">Could not load this problem.</p>
        <Link className="text-link" href="/admin/problems">
          ← Back to problems
        </Link>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">CONTENT / EDIT PROBLEM</p>
          <h1>{problem.title}</h1>
        </div>
        <Link className="text-link" href="/admin/problems">
          ← Back to problems
        </Link>
      </div>
      <ProblemForm initial={problem} submitLabel="Save changes" isSubmitting={isSubmitting} error={error} onSubmit={submit} isEdit />
    </main>
  );
}

export default function EditProblemPage() {
  return (
    <AdminRoute>
      <SiteHeader />
      <EditProblemContent />
      <SiteFooter />
    </AdminRoute>
  );
}
