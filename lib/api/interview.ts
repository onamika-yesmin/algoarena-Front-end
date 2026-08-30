// API bindings for the Mock Interview feature. Types are defined locally
// (not added to types/api.ts) since that file belongs to a parallel task.

import { apiRequest } from "./client";

export type InterviewDifficulty = "EASY" | "MEDIUM" | "HARD";
export type InterviewStatus = "in_progress" | "completed";

export interface InterviewMessage {
  role: "interviewer" | "candidate";
  content: string;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  topic: string;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  messages: InterviewMessage[];
  feedback?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSessionSummary {
  id: string;
  topic: string;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  score?: number;
  createdAt: string;
  messageCount: number;
  /** Short excerpt of the AI's closing feedback, only present once the
   *  session is completed — backed by the AIReport collection so this
   *  list doesn't have to load every session's full message transcript. */
  reportSummary?: string;
}

export const listInterviewSessions = () => apiRequest<InterviewSessionSummary[]>("/api/interview");

export const startInterviewSession = (payload: { topic: string; difficulty: InterviewDifficulty }) =>
  apiRequest<InterviewSession>("/api/interview", { method: "POST", body: payload });

export const getInterviewSession = (id: string) => apiRequest<InterviewSession>(`/api/interview/${id}`);

export const respondToInterview = (id: string, answer: string) =>
  apiRequest<InterviewSession>(`/api/interview/${id}/respond`, { method: "POST", body: { answer } });
