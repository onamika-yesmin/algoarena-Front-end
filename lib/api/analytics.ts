import { apiRequest } from "./client";

export interface VerdictBreakdownEntry {
  verdict: string;
  count: number;
}

export interface LanguageBreakdownEntry {
  language: string;
  count: number;
}

export interface DifficultyBreakdownEntry {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  count: number;
}

export interface ActivityEntry {
  date: string;
  count: number;
}

export interface AnalyticsResult {
  totalSubmissions: number;
  acceptedSubmissions: number;
  problemsSolved: number;
  accuracyPercent: number;
  verdictBreakdown: VerdictBreakdownEntry[];
  languageBreakdown: LanguageBreakdownEntry[];
  difficultyBreakdown: DifficultyBreakdownEntry[];
  activity: ActivityEntry[];
  currentStreakDays: number;
}

export const getMyAnalytics = () => apiRequest<AnalyticsResult>("/api/analytics/me");

export interface AnalyticsHistoryEntry {
  date: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  problemsSolved: number;
  accuracyPercent: number;
  currentStreakDays: number;
}

export const getMyAnalyticsHistory = (days = 30) =>
  apiRequest<AnalyticsHistoryEntry[]>(`/api/analytics/history?days=${days}`);
