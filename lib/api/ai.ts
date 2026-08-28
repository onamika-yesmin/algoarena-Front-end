import { apiRequest } from "./client";

export interface HintResult {
  level: number;
  maxLevel: number;
  hint: string;
  source: "ai" | "rule-based";
}

export const getHint = (payload: { problemId: string; level: number; code?: string }) =>
  apiRequest<HintResult>("/api/ai/hint", { method: "POST", body: payload });
