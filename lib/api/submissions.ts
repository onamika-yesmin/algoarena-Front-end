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
  language: string;
  source: string;
  stdin?: string;
}

// Ad-hoc "Run" against sample input only (no persisted Submission record).
// Backed by POST /api/submissions/execute.
export const runCode = (payload: RunPayload) =>
  apiRequest<{ run?: { output?: string; stderr?: string }; compile?: { output?: string; stderr?: string } }>("/api/submissions/execute", {
    method: "POST",
    body: payload,
  });
