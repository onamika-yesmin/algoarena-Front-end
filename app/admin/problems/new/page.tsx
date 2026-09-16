"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAdminTestCases, createAdminProblem } from "@/lib/api/admin";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { ProblemForm, type ProblemFormValues } from "@/components/admin/ProblemForm";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function NewProblemContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Creating a problem is two calls — create it, then seed its test cases.
  // If the second one fails the problem already exists, so remember its id:
  // the next submit retries only the test-case step instead of creating it
  // again (which would just 409 on the now-taken slug).
  const [createdProblemId, setCreatedProblemId] = useState<string | null>(null);

  const submit = async (values: ProblemFormValues) => {
    setIsSubmitting(true);
    setError(null);
    let problemId = createdProblemId;
    try {
      const tags = values.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const validTestCases = values.testCases.filter((testCase) => testCase.input.trim() || testCase.expectedOutput.trim());
      if (validTestCases.length === 0) throw new ApiError("Add at least one test case so the judge can grade submissions.", 400);

      if (!problemId) {
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
          referenceSolution: values.referenceSolution.code.trim() ? values.referenceSolution : undefined,
        });
        problemId = created.id;
        setCreatedProblemId(created.id);
      }

      // The judge reads from the separate TestCase collection, not the
      // embedded sampleTests — seed it with every test case (sample and
      // hidden alike) so the new problem is gradeable immediately.
      await addAdminTestCases(
        problemId,
        validTestCases.map(({ input, expectedOutput, isSample }) => ({ input, expectedOutput, isSample })),
      );

      router.push("/admin/problems");
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Could not create the problem.");
      setError(problemId ? `The problem was created, but its test cases couldn't be saved: ${message}` : message);
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell
      eyebrow="CONTENT / NEW PROBLEM"
      title="Create problem"
      description="Every test case you add here (sample and hidden) is used by the judge — this problem is gradeable the moment you save it."
    >
      <div className="admin-card">
        {createdProblemId && error && (
          <p className="form-error" style={{ marginBottom: 14 }}>
            Submitting again only retries adding the test cases — other changes to this form won&apos;t be saved.{" "}
            <Link className="text-link" href={`/admin/problems/${createdProblemId}/edit`}>
              Open the problem in the editor instead <span>→</span>
            </Link>
          </p>
        )}
        <ProblemForm
          submitLabel={createdProblemId ? "Retry adding test cases" : "Create problem"}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={submit}
        />
      </div>
    </AdminShell>
  );
}

export default function NewProblemPage() {
  return (
    <AdminRoute>
      <NewProblemContent />
      <SiteFooter />
    </AdminRoute>
  );
}
