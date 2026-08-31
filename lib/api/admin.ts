import { apiRequest } from "./client";
import type { AdminStats, AdminUser, AdminUserListResult, Difficulty, Language } from "@/types/api";

export const getAdminStats = () => apiRequest<AdminStats>("/api/admin/stats");

export const listAdminUsers = (params: { page?: number; limit?: number; search?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  const queryString = query.toString();
  return apiRequest<AdminUserListResult>(`/api/admin/users${queryString ? `?${queryString}` : ""}`);
};

export const updateAdminUser = (id: string, payload: { role?: "user" | "admin"; status?: "active" | "blocked" }) =>
  apiRequest<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: payload });

export interface AdminProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  basePoints: number;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminProblemListResult {
  items: AdminProblemSummary[];
  total: number;
  page: number;
  limit: number;
}

export const listAdminProblems = (params: { page?: number; limit?: number; search?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  const queryString = query.toString();
  return apiRequest<AdminProblemListResult>(`/api/problems/admin/all${queryString ? `?${queryString}` : ""}`);
};

export interface AdminReferenceSolution {
  language: Language;
  code: string;
}

export interface AdminProblemDetail {
  id: string;
  slug: string;
  title: string;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  isPublished: boolean;
  sampleTests: { input: string; expectedOutput: string; explanation?: string }[];
  starterCode: Partial<Record<Language, string>>;
  // Ground truth for the AI Test Case Generator (F10) — every generated
  // input is actually run against this solution to compute its real
  // expected output, rather than trusting a model-guessed one.
  referenceSolution?: AdminReferenceSolution;
}

export const getAdminProblem = (id: string) => apiRequest<AdminProblemDetail>(`/api/problems/admin/${id}`);

export interface AdminProblemInput {
  slug: string;
  title: string;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  difficulty: Difficulty;
  tags?: string[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  basePoints?: number;
  isPublished?: boolean;
  sampleTests?: { input: string; expectedOutput: string; explanation?: string }[];
  starterCode?: Partial<Record<Language, string>>;
  referenceSolution?: AdminReferenceSolution;
}

export const createAdminProblem = (payload: AdminProblemInput) => apiRequest<{ id: string }>("/api/problems", { method: "POST", body: payload });

export const updateAdminProblem = (id: string, payload: Partial<AdminProblemInput>) =>
  apiRequest<{ id: string }>(`/api/problems/${id}`, { method: "PATCH", body: payload });

export const deleteAdminProblem = (id: string) => apiRequest<null>(`/api/problems/admin/${id}`, { method: "DELETE" });

export interface AdminTestCaseInput {
  input: string;
  expectedOutput: string;
  explanation?: string;
  isSample?: boolean;
  order?: number;
}

export const addAdminTestCases = (problemId: string, testCases: AdminTestCaseInput[]) =>
  apiRequest<unknown>(`/api/problems/${problemId}/testcases`, { method: "POST", body: { testCases } });

export type TestCaseSource = "manual" | "ai-generated";

export interface AdminTestCaseRecord {
  id: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  order: number;
  source: TestCaseSource;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const listAdminTestCases = (problemId: string) => apiRequest<AdminTestCaseRecord[]>(`/api/problems/${problemId}/testcases`);

export const updateAdminTestCase = (
  testCaseId: string,
  payload: Partial<{ input: string; expectedOutput: string; isSample: boolean; order: number; reviewed: boolean }>,
) => apiRequest<AdminTestCaseRecord>(`/api/problems/testcases/${testCaseId}`, { method: "PATCH", body: payload });

export const deleteAdminTestCase = (testCaseId: string) => apiRequest<null>(`/api/problems/testcases/${testCaseId}`, { method: "DELETE" });
