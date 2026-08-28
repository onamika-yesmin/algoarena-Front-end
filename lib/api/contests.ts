import { apiRequest } from "./client";
import type { ContestDetail, ContestListResult, ContestScoreboardResult } from "@/types/api";

export interface CreateContestPayload {
  title: string;
  slug: string;
  description?: string;
  startTime: string;
  endTime: string;
  problems?: { problemId: string; points?: number }[];
}

export const createContest = (payload: CreateContestPayload) => apiRequest<{ id: string }>("/api/contests", { method: "POST", body: payload });

export const listContests = (params: { page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return apiRequest<ContestListResult>(`/api/contests${queryString ? `?${queryString}` : ""}`);
};

export const getContestByIdentifier = (identifier: string) => apiRequest<ContestDetail>(`/api/contests/${identifier}`);

export const registerForContest = (identifier: string) => apiRequest<{ registered: boolean }>(`/api/contests/${identifier}/register`, { method: "POST" });

export const getContestScoreboard = (identifier: string) => apiRequest<ContestScoreboardResult>(`/api/contests/${identifier}/scoreboard`);
