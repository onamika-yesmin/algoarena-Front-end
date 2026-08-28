"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addAdminTestCases, createAdminProblem } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { ProblemForm, type ProblemFormValues } from "@/components/admin/ProblemForm";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function NewProblemContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: ProblemFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const tags = values.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const validTestCases = values.testCases.filter((testCase) => testCase.input.trim() || testCase.expectedOutput.trim());
      if (validTestCases.length === 0) throw new ApiError("Add at least one test case so the judge can grade submissions.", 400);

      const created = await createAdminProblem({
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
        sampleTests: validTestCases.filter((testCase) => testCase.isSample).map(({ input, expectedOutput, explanation }) => ({ input, expectedOutput, explanation })),
        starterCode: values.starterCode,
      });

      // The judge reads from the separate TestCase collection, not the
      // embedded sampleTests — seed it with every test case (sample and
      // hidden alike) so the new problem is gradeable immediately.
      await addAdminTestCases(
        created.id,
        validTestCases.map(({ input, expectedOutput, isSample }) => ({ input, expectedOutput, isSample })),
      );

      router.push("/admin/problems");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not create the problem.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">CONTENT / NEW PROBLEM</p>
          <h1>Create problem</h1>
          <p>Every test case you add here (sample and hidden) is used by the judge — this problem is gradeable the moment you save it.</p>
        </div>
        <Link className="text-link" href="/admin/problems">
          ← Back to problems
        </Link>
      </div>
      <ProblemForm submitLabel="Create problem" isSubmitting={isSubmitting} error={error} onSubmit={submit} />
    </main>
  );
}

export default function NewProblemPage() {
  return (
    <AdminRoute>
      <SiteHeader />
      <NewProblemContent />
      <SiteFooter />
    </AdminRoute>
  );
}
