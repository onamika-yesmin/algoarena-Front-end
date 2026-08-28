import { apiRequest } from "./client";
import type { ProblemDetail, ProblemListResult } from "@/types/api";

export interface ListProblemsParams {
  difficulty?: string;
  tags?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const listProblems = (params: ListProblemsParams = {}) => {
  const query = new URLSearchParams();
  if (params.difficulty) query.set("difficulty", params.difficulty);
  if (params.tags) query.set("tags", params.tags);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return apiRequest<ProblemListResult>(`/api/problems${queryString ? `?${queryString}` : ""}`);
};

export const getProblemBySlug = (slug: string) => apiRequest<ProblemDetail>(`/api/problems/${slug}`);
