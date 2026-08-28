import { apiRequest } from "./client";
import type { LeaderboardResult, MyRank } from "@/types/api";

export const getGlobalLeaderboard = (params: { page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return apiRequest<LeaderboardResult>(`/api/leaderboard${queryString ? `?${queryString}` : ""}`);
};

export const getMyRank = () => apiRequest<MyRank>("/api/leaderboard/me");
