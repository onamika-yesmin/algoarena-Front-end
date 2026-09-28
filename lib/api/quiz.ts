import { apiRequest } from "./client";
import type {
  StartQuizPayload,
  StartQuizResult,
  UserAnswerPayload,
  SubmitQuizAnswersResult,
  QuizSessionResultBreakdown,
  AdminPendingQuestionsListResult,
  ReviewAction,
  EditQuizQuestionData,
  AdminPendingQuizQuestion,
  TriggerBatchGenerationPayload,
  TriggerBatchGenerationResult,
  QuestionDifficulty,
} from "@/types/quiz";

/**
 * POST /api/quiz/start
 * Initializes a new quiz session (Practice or Exam mode)
 */
export const startQuizSession = (payload: StartQuizPayload) => {
  return apiRequest<StartQuizResult>("/api/quiz/start", {
    method: "POST",
    body: payload,
  });
};

/**
 * POST /api/quiz/:sessionId/submit
 * Submits user answer array for grading & score calculation
 */
export const submitQuizAnswers = (
  sessionId: string,
  answers: UserAnswerPayload[],
) => {
  return apiRequest<SubmitQuizAnswersResult>(`/api/quiz/${sessionId}/submit`, {
    method: "POST",
    body: { answers },
  });
};

/**
 * GET /api/quiz/:sessionId/result
 * Fetches completed quiz session breakdown & explanations
 */
export const getQuizResult = (sessionId: string) => {
  return apiRequest<QuizSessionResultBreakdown>(`/api/quiz/${sessionId}/result`);
};

export interface ListAdminPendingParams {
  page?: number;
  limit?: number;
  topic?: string;
  difficulty?: QuestionDifficulty;
  status?: string;
}

/**
 * GET /api/quiz/admin/pending
 * Fetches paginated questions for admin moderation & database overview
 */
export const getAdminPendingQuestions = (params: ListAdminPendingParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.topic) query.set("topic", params.topic);
  if (params.difficulty) query.set("difficulty", params.difficulty);
  if (params.status) query.set("status", params.status);

  const queryString = query.toString();
  return apiRequest<AdminPendingQuestionsListResult>(
    `/api/quiz/admin/pending${queryString ? `?${queryString}` : ""}`,
  );
};

/**
 * PATCH /api/quiz/admin/:id/review
 * Approves, rejects, or edits a pending quiz question
 */
export const reviewAdminQuestion = (
  questionId: string,
  action: ReviewAction,
  updateData?: EditQuizQuestionData,
) => {
  return apiRequest<AdminPendingQuizQuestion>(
    `/api/quiz/admin/${questionId}/review`,
    {
      method: "PATCH",
      body: { action, updateData },
    },
  );
};

/**
 * POST /api/quiz/admin/generate-batch
 * Non-blocking admin batch question generation trigger (HTTP 202)
 */
export const triggerAdminBatchGeneration = (
  payload: TriggerBatchGenerationPayload,
) => {
  return apiRequest<TriggerBatchGenerationResult>(
    "/api/quiz/admin/generate-batch",
    {
      method: "POST",
      body: payload,
    },
  );
};

export interface AutoFlagResult {
  inspectedCount: number;
  flaggedLowAccuracyCount: number;
  flaggedHighAccuracyCount: number;
  flaggedQuestionIds: string[];
}

/**
 * POST /api/quiz/admin/auto-flag
 * Triggers Quality Control loop to flag low/high accuracy outlier questions
 */
export const triggerAdminAutoFlag = () => {
  return apiRequest<AutoFlagResult>("/api/quiz/admin/auto-flag", {
    method: "POST",
  });
};
