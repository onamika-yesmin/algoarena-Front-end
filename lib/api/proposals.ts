import { apiRequest } from "./client";
import type { Difficulty, Language, UserRole } from "@/types/api";

// Problem proposals: a learner proposes a problem from their profile
// (/profile/proposals), and an admin accepts it into the problem library or
// rejects it (/admin/proposals). Sending a proposal costs gems — a rejected
// one refunds half, an accepted one keeps the full cost, and deleting one
// before it's reviewed refunds it all.

export type ProposalStatus = "pending" | "accepted" | "rejected";
export type ProposalStatusFilter = ProposalStatus | "all";

/** Mirrors utils/gems.ts on the back end (GET /api/proposals/me also returns both). */
export const PROPOSAL_COST_GEMS = 50;
export const PROPOSAL_REJECT_REFUND_GEMS = 25;

/** Mirrors the back end's validation (modules/proposal/proposal.service.ts). */
export const PROPOSAL_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  statementMin: 20,
  statementMax: 10000,
  formatMax: 3000,
  constraintsMax: 2000,
  tagsMax: 8,
  tagMax: 30,
  timeLimitMin: 100,
  timeLimitMax: 10000,
  memoryLimitMin: 16,
  memoryLimitMax: 1024,
  testCasesMax: 20,
  testCaseTextMax: 10000,
  explanationMax: 1000,
  codeMax: 20000,
  noteMax: 1000,
  reviewNoteMax: 500,
  slugMin: 3,
  slugMax: 80,
  pointsMax: 10000,
} as const;

export interface ProposalTestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
  isSample: boolean;
}

export interface ProposalSummary {
  id: string;
  status: ProposalStatus;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  testCaseCount: number;
  sampleCount: number;
  noteToReviewer: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  /** The problem created when the proposal was accepted. */
  problem: { id: string; slug: string; isPublished: boolean } | null;
  /** Gems this proposal has cost its author in total, and how many came back. */
  gemsSpent: number;
  gemsRefunded: number;
  /** Only on the admin endpoints. */
  user?: { id: string; name: string; email: string; role: UserRole };
}

export interface ProposalDetail extends ProposalSummary {
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: ProposalTestCase[];
  starterCode: Record<Language, string>;
  referenceSolution: { language: Language; code: string } | null;
}

export interface MyProposalsResult {
  gems: number;
  /** Gems taken when a proposal is sent for review. */
  cost: number;
  /** Gems given back when a proposal is rejected. */
  rejectRefund: number;
  maxPending: number;
  pendingCount: number;
  canPropose: boolean;
  items: ProposalSummary[];
}

export interface ProposalInput {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: ProposalTestCase[];
  starterCode: Record<Language, string>;
  /** Omit to save none (or to clear a saved one when editing). */
  referenceSolution?: { language: Language; code: string };
  noteToReviewer: string;
}

export interface ProposalListResult {
  items: ProposalSummary[];
  total: number;
  page: number;
  limit: number;
  /** Pending proposals overall, whatever status filter was requested. */
  pendingCount: number;
}

export interface ReviewProposalPayload {
  action: "accept" | "reject";
  /** Shown to the learner (max 500 characters). */
  note?: string;
  /** Accept only. Blank lets the server derive one from the title. */
  slug?: string;
  /** Accept only. 0–10000, default 100. */
  basePoints?: number;
  /** Accept only. false keeps the new problem as a draft. */
  publish?: boolean;
}

export const getMyProposals = () => apiRequest<MyProposalsResult>("/api/proposals/me");

export const getProposal = (id: string) => apiRequest<ProposalDetail>(`/api/proposals/${encodeURIComponent(id)}`);

export const createProposal = (payload: ProposalInput) => apiRequest<ProposalDetail>("/api/proposals", { method: "POST", body: payload });

export const updateProposal = (id: string, payload: ProposalInput) =>
  apiRequest<ProposalDetail>(`/api/proposals/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });

/** A proposal still waiting for review gives its cost back; `gemsRefunded` says how many. */
export const deleteProposal = (id: string) =>
  apiRequest<{ deleted: boolean; gemsRefunded: number }>(`/api/proposals/${encodeURIComponent(id)}`, { method: "DELETE" });

export const listProposals = (params: { status?: ProposalStatusFilter; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return apiRequest<ProposalListResult>(`/api/proposals${queryString ? `?${queryString}` : ""}`);
};

export const reviewProposal = (id: string, payload: ReviewProposalPayload) =>
  apiRequest<ProposalDetail>(`/api/proposals/${encodeURIComponent(id)}/review`, { method: "POST", body: payload });

/** Same slug the server derives from a title when an admin leaves the slug blank. */
export const slugifyTitle = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PROPOSAL_LIMITS.slugMax - 10)
    .replace(/-+$/g, "") || "problem";

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Not accepted",
};

/** Badge class (globals.css) for each status. */
export const PROPOSAL_STATUS_BADGE: Record<ProposalStatus, string> = {
  pending: "badge badge-draft",
  accepted: "badge badge-published",
  rejected: "badge badge-blocked",
};
