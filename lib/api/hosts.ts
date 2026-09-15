import { apiRequest } from "./client";
import type { HostRequest, HostRequestListResult, HostRequestStatus, MyHostRequestResult } from "@/types/api";

// Contest host requests: a regular user asks to run their own contests
// (/host), an admin approves or rejects it (/admin/host-requests). Approving
// turns the requester's role into "guest" (an approved contest host).

export interface HostRequestPayload {
  organization?: string;
  contestTitle: string;
  contestDescription: string;
  /** ISO timestamps. */
  proposedStartTime?: string;
  proposedEndTime?: string;
  expectedParticipants?: number;
  contactEmail?: string;
  message?: string;
}

export const createHostRequest = (payload: HostRequestPayload) =>
  apiRequest<HostRequest>("/api/host-requests", { method: "POST", body: payload });

/** The caller's current role plus their latest request (any status), or `request: null`. */
export const getMyHostRequest = () => apiRequest<MyHostRequestResult>("/api/host-requests/me");

export type HostRequestStatusFilter = HostRequestStatus | "all";

export const listHostRequests = (params: { status?: HostRequestStatusFilter; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const queryString = query.toString();
  return apiRequest<HostRequestListResult>(`/api/host-requests${queryString ? `?${queryString}` : ""}`);
};

export interface ReviewHostRequestPayload {
  action: "approve" | "reject";
  /** Optional note shown to the requester (max 500 characters). */
  note?: string;
}

export const reviewHostRequest = (id: string, payload: ReviewHostRequestPayload) =>
  apiRequest<HostRequest>(`/api/host-requests/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
