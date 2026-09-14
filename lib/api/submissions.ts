import { apiRequest } from "./client";
import type { Language, Submission, SubmissionListResult } from "@/types/api";

export interface SubmitPayload {
  problemId: string;
  code: string;
  language: Language;
  contestId?: string;
}

export const submitSolution = (payload: SubmitPayload) => apiRequest<Submission>("/api/submissions", { method: "POST", body: payload });

export const getSubmissionById = (id: string) => apiRequest<Submission>(`/api/submissions/${id}`);

export const listSubmissions = (params: { problemId?: string; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.problemId) query.set("problemId", params.problemId);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return apiRequest<SubmissionListResult>(`/api/submissions${queryString ? `?${queryString}` : ""}`);
};

export interface RunPayload {
  language: Language;
  source: string;
  /** Run against this problem's sample tests and compare the output. */
  problemId?: string;
  /** Custom input instead of the sample tests (output is not compared). */
  stdin?: string;
}

/**
 * How one sample run ended. PASSED / WRONG_ANSWER compare against the sample's
 * expected output; NO_EXPECTED means it ran cleanly on custom input (nothing
 * to compare against); SKIPPED cases never ran because the code didn't compile.
 */
export type RunOutcome =
  | "PASSED"
  | "WRONG_ANSWER"
  | "NO_EXPECTED"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "SKIPPED";

export interface RunCaseResult {
  index: number;
  input: string;
  expectedOutput: string | null;
  outcome: RunOutcome;
  stdout: string;
  stderr: string;
  compileOutput: string;
  exitCode: number | null;
  timeMs: number | null;
  memoryKb: number | null;
}

export interface RunResult {
  /** The first failing case's outcome, or PASSED / NO_EXPECTED when nothing failed. */
  outcome: RunOutcome;
  passed: number;
  total: number;
  cases: RunCaseResult[];
}

// Ad-hoc "Run" — executes against the problem's sample tests (no persisted
// Submission record). Backed by POST /api/submissions/execute.
export const runCode = (payload: RunPayload) => apiRequest<RunResult>("/api/submissions/execute", { method: "POST", body: payload });
