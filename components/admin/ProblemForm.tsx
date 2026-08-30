"use client";

import { useState } from "react";
import type { Difficulty, Language } from "@/types/api";
import type { AdminProblemDetail, AdminTestCaseInput } from "@/lib/api/admin";

export interface ProblemFormValues {
  slug: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: Difficulty;
  tags: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  isPublished: boolean;
  starterCode: Record<Language, string>;
  testCases: (AdminTestCaseInput & { isSample: boolean })[];
}

const emptyTestCase = (): AdminTestCaseInput & { isSample: boolean } => ({ input: "", expectedOutput: "", explanation: "", isSample: true });

const fromDetail = (detail?: AdminProblemDetail): ProblemFormValues => ({
  slug: detail?.slug ?? "",
  title: detail?.title ?? "",
  statement: detail?.statement ?? "",
  inputFormat: detail?.inputFormat ?? "",
  outputFormat: detail?.outputFormat ?? "",
  constraints: detail?.constraints ?? "",
  difficulty: detail?.difficulty ?? "EASY",
  tags: detail?.tags?.join(", ") ?? "",
  timeLimitMs: detail?.timeLimitMs ?? 2000,
  memoryLimitMb: detail?.memoryLimitMb ?? 256,
  basePoints: detail?.basePoints ?? 100,
  isPublished: detail?.isPublished ?? true,
  starterCode: {
    python: detail?.starterCode?.python ?? "",
    cpp: detail?.starterCode?.cpp ?? "",
    javascript: detail?.starterCode?.javascript ?? "",
  },
  testCases: detail?.sampleTests?.length
    ? detail.sampleTests.map((sample) => ({ ...sample, isSample: true }))
    : [emptyTestCase()],
});

interface ProblemFormProps {
  initial?: AdminProblemDetail;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (values: ProblemFormValues) => void;
  /** Edit mode doesn't re-sync the hidden test case collection — shown as a note. */
  isEdit?: boolean;
}

export function ProblemForm({ initial, submitLabel, isSubmitting, error, onSubmit, isEdit }: ProblemFormProps) {
  const [values, setValues] = useState<ProblemFormValues>(() => fromDetail(initial));

  const update = <K extends keyof ProblemFormValues>(key: K, value: ProblemFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const updateTestCase = (index: number, patch: Partial<AdminTestCaseInput & { isSample: boolean }>) =>
    setValues((current) => ({
      ...current,
      testCases: current.testCases.map((testCase, i) => (i === index ? { ...testCase, ...patch } : testCase)),
    }));

  const addTestCase = () => setValues((current) => ({ ...current, testCases: [...current.testCases, emptyTestCase()] }));
  const removeTestCase = (index: number) =>
    setValues((current) => ({ ...current, testCases: current.testCases.filter((_, i) => i !== index) }));

  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      {error && <p className="form-error">{error}</p>}

      <div className="admin-form-row">
        <label>
          Title
          <input required value={values.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label>
          Slug (URL-safe, unique)
          <input required value={values.slug} onChange={(event) => update("slug", event.target.value)} placeholder="two-sum" />
        </label>
      </div>

      <label>
        Statement
        <textarea required rows={6} value={values.statement} onChange={(event) => update("statement", event.target.value)} />
      </label>

      <div className="admin-form-row">
        <label>
          Input format
          <textarea rows={3} value={values.inputFormat} onChange={(event) => update("inputFormat", event.target.value)} />
        </label>
        <label>
          Output format
          <textarea rows={3} value={values.outputFormat} onChange={(event) => update("outputFormat", event.target.value)} />
        </label>
      </div>

      <label>
        Constraints
        <textarea rows={3} value={values.constraints} onChange={(event) => update("constraints", event.target.value)} />
      </label>

      <div className="admin-form-row">
        <label>
          Difficulty
          <select value={values.difficulty} onChange={(event) => update("difficulty", event.target.value as Difficulty)}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>
        <label>
          Tags (comma-separated)
          <input value={values.tags} onChange={(event) => update("tags", event.target.value)} placeholder="array, hashmap" />
        </label>
        <label>
          Base points
          <input type="number" min={0} value={values.basePoints} onChange={(event) => update("basePoints", Number(event.target.value))} />
        </label>
      </div>

      <div className="admin-form-row">
        <label>
          Time limit (ms)
          <input type="number" min={100} value={values.timeLimitMs} onChange={(event) => update("timeLimitMs", Number(event.target.value))} />
        </label>
        <label>
          Memory limit (MB)
          <input type="number" min={16} value={values.memoryLimitMb} onChange={(event) => update("memoryLimitMb", Number(event.target.value))} />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 6 }}>Visibility</span>
          <select value={values.isPublished ? "published" : "draft"} onChange={(event) => update("isPublished", event.target.value === "published")}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden from learners)</option>
          </select>
        </label>
      </div>

      <h3 style={{ margin: "8px 0 0" }}>Starter code</h3>
      <div className="admin-form-row">
        <label>
          Python
          <textarea rows={5} value={values.starterCode.python} onChange={(event) => update("starterCode", { ...values.starterCode, python: event.target.value })} />
        </label>
        <label>
          C++
          <textarea rows={5} value={values.starterCode.cpp} onChange={(event) => update("starterCode", { ...values.starterCode, cpp: event.target.value })} />
        </label>
        <label>
          JavaScript
          <textarea rows={5} value={values.starterCode.javascript} onChange={(event) => update("starterCode", { ...values.starterCode, javascript: event.target.value })} />
        </label>
      </div>

      <h3 style={{ margin: "8px 0 0" }}>Test cases</h3>
      {isEdit && (
        <p className="problem-list-status" style={{ padding: 0 }}>
          Editing here updates the sample tests shown on the problem page. The judge&apos;s hidden test cases were set when this
          problem was created and aren&apos;t re-synced by editing — add more via the API if needed.
        </p>
      )}
      {values.testCases.map((testCase, index) => (
        <div key={index} style={{ border: "1px solid #303854", padding: 16, display: "grid", gap: 10 }}>
          <div className="admin-form-row">
            <label>
              Input
              <textarea rows={3} value={testCase.input} onChange={(event) => updateTestCase(index, { input: event.target.value })} />
            </label>
            <label>
              Expected output
              <textarea rows={3} value={testCase.expectedOutput} onChange={(event) => updateTestCase(index, { expectedOutput: event.target.value })} />
            </label>
          </div>
          <label>
            Explanation (optional, shown to learners for sample tests)
            <input value={testCase.explanation ?? ""} onChange={(event) => updateTestCase(index, { explanation: event.target.value })} />
          </label>
          <div className="admin-form-actions">
            <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, textTransform: "none" }}>
              <input type="checkbox" style={{ width: "auto" }} checked={testCase.isSample} onChange={(event) => updateTestCase(index, { isSample: event.target.checked })} />
              Sample (visible to learners on the problem page)
            </label>
            {values.testCases.length > 1 && (
              <button type="button" className="icon-button icon-button-danger" onClick={() => removeTestCase(index)}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="icon-button" onClick={addTestCase} style={{ justifySelf: "start" }}>
        + Add test case
      </button>

      <div className="admin-form-actions">
        <button type="submit" className="button button-small" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
