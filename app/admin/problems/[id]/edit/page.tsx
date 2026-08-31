"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminProblem, updateAdminProblem, type AdminProblemDetail } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import { ProblemForm, type ProblemFormValues } from "@/components/admin/ProblemForm";
import { TestCaseManager } from "@/components/admin/TestCaseManager";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function EditProblemContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [problem, setProblem] = useState<AdminProblemDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    getAdminProblem(params.id)
      .then((data) => {
        setProblem(data);
        setStatus("ready");
      })
      .catch((requestError) => {
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load this problem."));
        setStatus("error");
      });
  }, [params.id]);

  useEffect(load, [load]);

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
        referenceSolution: values.referenceSolution.code.trim() ? values.referenceSolution : undefined,
      });
      router.push("/admin/problems");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update the problem."));
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <AdminShell eyebrow="CONTENT / EDIT PROBLEM" title="Loading…">
        <Loader label="Loading problem…" />
      </AdminShell>
    );
  }

  if (status === "error" || !problem) {
    return (
      <AdminShell eyebrow="CONTENT / EDIT PROBLEM" title="Edit problem">
        <AdminErrorState message={loadErrorMessage} onRetry={load} />
      </AdminShell>
    );
  }

  return (
    <AdminShell eyebrow="CONTENT / EDIT PROBLEM" title={problem.title}>
      <div className="admin-card">
        <ProblemForm initial={problem} submitLabel="Save changes" isSubmitting={isSubmitting} error={error} onSubmit={submit} isEdit />
      </div>
      <TestCaseManager problemId={problem.id} hasReferenceSolution={Boolean(problem.referenceSolution?.code?.trim())} />
    </AdminShell>
  );
}

export default function EditProblemPage() {
  return (
    <AdminRoute>
      <EditProblemContent />
      <SiteFooter />
    </AdminRoute>
  );
}
