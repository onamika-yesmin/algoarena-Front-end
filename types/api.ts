// Shared API types matching the backend's response envelope
// ({ success, statusCode, message, data }) and Problem/TestCase/Submission
// shapes (see algoarena-back-end/src/models and 05-API-CONTRACT.md).

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type Language = "python" | "cpp" | "javascript";

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  basePoints: number;
  solvedByMe: boolean;
}

export interface ProblemListResult {
  items: ProblemSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface SampleTest {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  sampleTests: SampleTest[];
  starterCode: Partial<Record<Language, string>>;
  mySubmissionsCount: number;
  myBestVerdict: string | null;
}

export type Verdict =
  | "PENDING"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR";

export interface FailedTest {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  isSample: boolean;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  contestId?: string;
  language: Language;
  code: string;
  verdict: Verdict;
  passedTests: number;
  totalTests: number;
  runtimeMs: number;
  memoryKb: number;
  score: number;
  errorMessage?: string;
  failedTest?: FailedTest;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionListResult {
  items: Submission[];
  total: number;
  page: number;
  limit: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  profilePicUrl?: string;
  totalScore: number;
  problemsSolved: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface MyRank {
  rank: number | null;
  totalScore: number;
  problemsSolved: number;
  totalRanked: number;
}

export type ContestStatus = "UPCOMING" | "ONGOING" | "ENDED";

export interface ContestSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  problemCount: number;
  status: ContestStatus;
}

export interface ContestListResult {
  items: ContestSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ContestProblemEntry {
  problemId: string;
  slug: string | null;
  title: string;
  difficulty: Difficulty | null;
  points: number;
}

export interface ContestDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: ContestStatus;
  isRegistered: boolean;
  problems: ContestProblemEntry[];
}

export interface ContestScoreboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalScore: number;
  problemsSolved: number;
}

export interface ContestScoreboardResult {
  contestId: string;
  entries: ContestScoreboardEntry[];
}

export interface CurrentUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  profilePicUrl?: string;
  role: "user" | "admin";
  status: "active" | "blocked";
  createdAt?: string;
}
