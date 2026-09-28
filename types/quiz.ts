export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "OUTPUT_PREDICTION"
  | "COMPLEXITY"
  | "BUG_SPOTTING";

export type QuestionStatus = "pending_review" | "approved" | "rejected";

export type VerificationStatus = "verified" | "failed";

export type SessionMode = "PRACTICE" | "EXAM";

export type SessionStatus = "active" | "completed" | "expired";

export interface CodeSnippet {
  language: string;
  code: string;
}

export interface QuizQuestionPublic {
  _id?: string;
  questionId?: string;
  type: QuestionType;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  codeSnippet?: CodeSnippet;
  options: string[];
}

export interface StartQuizPayload {
  topic: string;
  difficulty: QuestionDifficulty;
  mode: SessionMode;
  count?: number;
}

export interface StartQuizResult {
  sessionId: string;
  mode: SessionMode;
  totalQuestions: number;
  timerDurationSeconds: number;
  expiresAt: string;
  questions: QuizQuestionPublic[];
}

export interface UserAnswerPayload {
  questionId: string;
  userAnswer: number | string;
  timeTakenSeconds?: number;
}

export interface SubmitQuizAnswersResult {
  sessionId: string;
  status: SessionStatus;
  mode: SessionMode;
  score: number;
  maxPossibleScore: number;
  correctCount: number;
  totalQuestions: number;
  earnedGems: number;
  completedAt: string;
}

export interface DetailedSessionQuestion {
  questionId: string;
  type: QuestionType;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  codeSnippet?: CodeSnippet;
  options: string[];
  correctAnswer?: number | string;
  explanation?: string;
  userAnswer?: number | string;
  isCorrect?: boolean;
  timeTakenSeconds?: number;
}

export interface QuizSessionResultBreakdown {
  sessionId: string;
  mode: SessionMode;
  status: SessionStatus;
  score: number;
  maxPossibleScore?: number;
  correctCount?: number;
  earnedGems?: number;
  totalQuestions: number;
  startedAt: string;
  expiresAt: string;
  completedAt?: string;
  questions: DetailedSessionQuestion[];
}

export interface AdminPendingQuizQuestion {
  _id: string;
  type: QuestionType;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  codeSnippet?: CodeSnippet;
  options: string[];
  correctAnswer: number | string;
  explanation: string;
  verificationStatus: VerificationStatus;
  status: QuestionStatus;
  dedupHash: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPendingQuestionsListResult {
  questions: AdminPendingQuizQuestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ReviewAction = "approve" | "reject" | "edit";

export interface EditQuizQuestionData {
  questionText?: string;
  options?: string[];
  correctAnswer?: number | string;
  explanation?: string;
  codeSnippet?: CodeSnippet;
  topic?: string;
  difficulty?: QuestionDifficulty;
}

export interface TriggerBatchGenerationPayload {
  topic: string;
  difficulty: QuestionDifficulty;
  count?: number;
  type?: QuestionType;
}

export interface TriggerBatchGenerationResult {
  topic: string;
  difficulty: QuestionDifficulty;
  count: number;
  status: string;
}
