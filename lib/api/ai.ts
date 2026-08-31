import { apiRequest } from "./client";
import type { ComplexityReport, RefactorSuggestion } from "@/types/api";
import type { AdminTestCaseRecord } from "./admin";

export interface HintResult {
  level: number;
  maxLevel: number;
  hint: string;
  source: "ai" | "rule-based";
}

export const getHint = (payload: { problemId: string; level: number; code?: string }) =>
  apiRequest<HintResult>("/api/ai/hint", { method: "POST", body: payload });

export const runComplexityAudit = (submissionId: string) =>
  apiRequest<ComplexityReport>("/api/ai/audit", { method: "POST", body: { submissionId } });

// No rule-based Plan-B for refactor suggestions (see refactor.service.ts) —
// when ANTHROPIC_API_KEY isn't configured, or Claude's response couldn't be
// parsed after a retry, the backend returns an empty `suggestions` array
// with source:"unavailable" and a human-readable `message` instead of
// fabricating a rewrite. source:"ai" with an empty array means the model
// looked and genuinely found nothing worth changing.
export interface RefactorResult {
  suggestions: RefactorSuggestion[];
  source: "ai" | "unavailable";
  message?: string;
}

export const generateRefactorSuggestions = (submissionId: string) =>
  apiRequest<RefactorResult>("/api/ai/refactor", { method: "POST", body: { submissionId } });

export const verifyRefactorSuggestion = (submissionId: string, suggestionIndex: number) =>
  apiRequest<RefactorSuggestion>("/api/ai/refactor/verify", { method: "POST", body: { submissionId, suggestionIndex } });

// Automated Test Case Generator (F10, admin-only). Every generated case is
// inserted with reviewed:false — it never affects grading until an admin
// approves it (updateAdminTestCase(id, { reviewed: true })), so `created`
// here is a pending queue to review, not live test cases yet.
export interface GenerateTestsResult {
  created: AdminTestCaseRecord[];
  requested: number;
  discarded: number;
  source: "ai" | "unavailable";
  message?: string;
}

export const generateTestCases = (problemId: string) =>
  apiRequest<GenerateTestsResult>("/api/ai/generate-tests", { method: "POST", body: { problemId } });
