import { apiRequest } from "./client";
import type {
  ContestDetail,
  ContestListResult,
  ContestScoreboardResult,
  ContestStatus,
  ManagedContestDetail,
  ManagedContestListResult,
} from "@/types/api";

export interface CreateContestPayload {
  title: string;
  slug: string;
  description?: string;
  startTime: string;
  endTime: string;
  problems?: { problemId: string; points?: number }[];
  /** Whether the contest is published (a draft is not publicly listed). */
  isPublished?: boolean;
}

/** PATCH accepts any subset of the create fields. */
export type UpdateContestPayload = Partial<CreateContestPayload>;

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

// ---------------------------------------------------------------------------
// Contest manager. Admins can manage every contest; a "guest" host only the
// contests they created (anyone else's answers 404).

export const listManagedContests = (params: { page?: number; limit?: number; search?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  const queryString = query.toString();
  return apiRequest<ManagedContestListResult>(`/api/contests/manage${queryString ? `?${queryString}` : ""}`);
};

export const getManagedContest = (id: string) => apiRequest<ManagedContestDetail>(`/api/contests/manage/${encodeURIComponent(id)}`);

export const updateManagedContest = (id: string, payload: UpdateContestPayload) =>
  apiRequest<ManagedContestDetail>(`/api/contests/manage/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });

/** Also removes the contest's registrations. */
export const deleteManagedContest = (id: string) =>
  apiRequest<{ deleted: boolean }>(`/api/contests/manage/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Shared helpers.

/**
 * Mirrors the backend's getContestStatus() (contest.service.ts) so a page
 * moves from Upcoming → Live → Ended on its own instead of staying frozen on
 * whatever status it loaded with. Falls back to the server's status when the
 * times can't be parsed.
 */
export const deriveContestStatus = (contest: { startTime: string; endTime: string; status: ContestStatus }, now: number): ContestStatus => {
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return contest.status;
  if (now < start) return "UPCOMING";
  if (now > end) return "ENDED";
  return "ONGOING";
};

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO timestamp → the viewer's local wall-clock time as an `<input type="datetime-local">` value ("" if unset/invalid). */
export const isoToDateTimeLocal = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * `<input type="datetime-local">` value (local wall-clock time, no offset) →
 * ISO timestamp in UTC, or null when empty/invalid. Parsed field by field so
 * it's always read as local time regardless of the browser's string parsing.
 */
export const dateTimeLocalToIso = (value: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hours, minutes, seconds] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds ?? 0));
  if (Number.isNaN(date.getTime()) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return date.toISOString();
};
