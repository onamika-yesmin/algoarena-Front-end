"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { listHostRequests, reviewHostRequest, type HostRequestStatusFilter } from "@/lib/api/hosts";
import type { HostRequest, HostRequestStatus, UserRole } from "@/types/api";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { Pagination } from "@/components/ui/Pagination";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import styles from "./hostRequests.module.css";

const PAGE_SIZE = 20;
const NOTE_MAX = 500;

const TABS: { value: HostRequestStatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const EMPTY_MESSAGE: Record<HostRequestStatusFilter, string> = {
  pending: "No pending requests — you're all caught up.",
  approved: "No approved requests yet.",
  rejected: "No rejected requests.",
  all: "Nobody has asked to host a contest yet.",
};

const STATUS_BADGE: Record<HostRequestStatus, string> = {
  pending: "badge-draft",
  approved: "badge-published",
  rejected: "badge-blocked",
};

const roleBadgeClass = (role: UserRole) => (role === "admin" ? "badge badge-admin" : role === "guest" ? `badge ${styles.badgeGuest}` : "badge badge-user");
const roleLabel = (role: UserRole) => (role === "guest" ? "host" : role);

const formatDateTime = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const formatWindow = (start: string | null, end: string | null) => {
  const from = formatDateTime(start);
  const to = formatDateTime(end);
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Not specified";
};

type Review = { id: string; action: "approve" | "reject"; note: string };

function HostRequestsContent() {
  const baseId = useId();
  const [tab, setTab] = useState<HostRequestStatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HostRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState<Review | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  // Only the most recent load's response is applied, so a slower response
  // for an older tab/page can't overwrite newer results.
  const latestRequestRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    setStatus("loading");
    listHostRequests({ status: tab, page, limit: PAGE_SIZE })
      .then((result) => {
        if (requestId !== latestRequestRef.current) return;
        setPendingCount(result.pendingCount);
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
        // e.g. the last request on the last page was just approved away.
        if (result.items.length === 0 && page > lastPage) {
          setPage(lastPage);
          return;
        }
        setItems(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestId !== latestRequestRef.current) return;
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load host requests."));
        setStatus("error");
      });
  }, [tab, page]);

  useEffect(load, [load]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [feedback]);

  const changeTab = (next: HostRequestStatusFilter) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
    setItems([]);
    setReview(null);
    setFeedback(null);
  };

  const changePage = (next: number) => {
    setPage(next);
    setReview(null);
  };

  const toggleExpanded = (id: string) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  const openReview = (id: string, action: Review["action"]) => {
    setFeedback(null);
    setReview((current) => (current?.id === id ? { ...current, action } : { id, action, note: "" }));
  };

  const submitReview = async (event: React.FormEvent<HTMLFormElement>, request: HostRequest) => {
    event.preventDefault();
    if (!review || review.id !== request.id || busyId) return;
    const note = review.note.trim();
    if (note.length > NOTE_MAX) return;
    const requester = request.user?.name ?? "this user";
    if (review.action === "reject" && !window.confirm(`Reject ${requester}'s request to host "${request.contestTitle}"?`)) return;

    setBusyId(request.id);
    setFeedback(null);
    try {
      await reviewHostRequest(request.id, { action: review.action, note: note || undefined });
      setFeedback({
        tone: "success",
        text:
          review.action === "approve"
            ? `Approved — ${requester} is now a host and can create and manage their own contests.`
            : `Rejected ${requester}'s request to host "${request.contestTitle}".`,
      });
      setReview(null);
      load();
    } catch (requestError) {
      setFeedback({ tone: "error", text: getErrorMessage(requestError, "Could not review this request.") });
      // Already reviewed by someone else — show the current state.
      if (requestError instanceof ApiError && requestError.statusCode === 409) {
        setReview(null);
        load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const showList = items.length > 0 && status !== "error";

  return (
    <AdminShell
      eyebrow="PEOPLE / HOST REQUESTS"
      title="Host requests"
      description="People asking to run their own contests. Approving makes them a host: they can create contests and manage only the ones they created."
    >
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Filter requests by status">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles.tab}${tab === item.value ? ` ${styles.tabActive}` : ""}`}
              aria-pressed={tab === item.value}
              onClick={() => changeTab(item.value)}
            >
              {item.label}
              {item.value === "pending" && pendingCount !== null && pendingCount > 0 && (
                <span className={styles.tabCount} aria-label={`${pendingCount} pending`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {status === "ready" && (
          <span className="admin-toolbar-count">
            {total} {total === 1 ? "request" : "requests"}
          </span>
        )}
      </div>

      <div aria-live="polite">
        {feedback && (
          <p ref={feedbackRef} className={`${feedback.tone === "success" ? "form-success" : "form-error"} ${styles.feedback}`} role={feedback.tone === "error" ? "alert" : "status"}>
            {feedback.text}
          </p>
        )}
      </div>

      {status === "loading" && items.length === 0 && <AdminTableSkeleton rows={5} />}
      {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={load} />}
      {status === "ready" && items.length === 0 && <AdminEmptyState message={EMPTY_MESSAGE[tab]} />}

      {showList && (
        <>
          <ul className={`${styles.list}${status === "loading" ? ` ${styles.isBusy}` : ""}`} aria-busy={status === "loading"}>
            {items.map((request) => {
              const isExpanded = Boolean(expanded[request.id]);
              const isReviewing = review?.id === request.id;
              const isBusy = busyId === request.id;
              const detailsId = `${baseId}-details-${request.id}`;
              const noteId = `${baseId}-note-${request.id}`;
              const reviewed = formatDateTime(request.reviewedAt);
              return (
                <li key={request.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div className={styles.requester}>
                      <span className="admin-cell-avatar" aria-hidden="true">
                        {(request.user?.name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div className={styles.requesterText}>
                        <span className="admin-cell-name">{request.user?.name ?? "Unknown user"}</span>
                        {request.user?.email && <span className="admin-cell-sub">{request.user.email}</span>}
                      </div>
                      {request.user && (
                        <span className={roleBadgeClass(request.user.role)} title="Current role">
                          {roleLabel(request.user.role)}
                        </span>
                      )}
                    </div>
                    <span className={`badge ${STATUS_BADGE[request.status]}`}>{request.status}</span>
                  </div>

                  <h2 className={styles.contestTitle}>{request.contestTitle}</h2>

                  <dl className={styles.facts}>
                    <div>
                      <dt>Proposed window</dt>
                      <dd>{formatWindow(request.proposedStartTime, request.proposedEndTime)}</dd>
                    </div>
                    <div>
                      <dt>Expected participants</dt>
                      <dd>{request.expectedParticipants ?? "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDateTime(request.createdAt) ?? "—"}</dd>
                    </div>
                    {reviewed && (
                      <div>
                        <dt>Reviewed</dt>
                        <dd>{reviewed}</dd>
                      </div>
                    )}
                  </dl>

                  {request.reviewNote && (
                    <p className={styles.reviewNote}>
                      <b>Review note:</b> {request.reviewNote}
                    </p>
                  )}

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className="icon-button"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => toggleExpanded(request.id)}
                    >
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>
                    {request.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className={`icon-button ${styles.approveButton}`}
                          disabled={isBusy}
                          aria-pressed={isReviewing && review?.action === "approve"}
                          onClick={() => openReview(request.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-danger"
                          disabled={isBusy}
                          aria-pressed={isReviewing && review?.action === "reject"}
                          onClick={() => openReview(request.id, "reject")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>

                  {isExpanded && (
                    <div id={detailsId} className={styles.details}>
                      <div>
                        <h3>Contest description</h3>
                        <p className={styles.prewrap}>{request.contestDescription}</p>
                      </div>
                      <dl className={styles.facts}>
                        <div>
                          <dt>Organization</dt>
                          <dd>{request.organization || "—"}</dd>
                        </div>
                        <div>
                          <dt>Contact email</dt>
                          <dd>
                            {request.contactEmail ? (
                              <a className="text-link" href={`mailto:${request.contactEmail}`}>
                                {request.contactEmail}
                              </a>
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>
                      </dl>
                      <div>
                        <h3>Message</h3>
                        <p className={styles.prewrap}>{request.message || "No message."}</p>
                      </div>
                    </div>
                  )}

                  {isReviewing && review && request.status === "pending" && (
                    <form className={`${styles.review} ${review.action === "reject" ? styles.reviewReject : styles.reviewApprove}`} onSubmit={(event) => submitReview(event, request)}>
                      <p className={styles.reviewTitle}>
                        {review.action === "approve"
                          ? `Approve ${request.user?.name ?? "this user"} as a contest host?`
                          : `Reject ${request.user?.name ?? "this user"}'s request?`}
                      </p>
                      <label htmlFor={noteId} className={styles.noteLabel}>
                        <span>Note to the requester (optional)</span>
                        <span className={styles.counter}>
                          {review.note.length}/{NOTE_MAX}
                        </span>
                      </label>
                      <textarea
                        id={noteId}
                        rows={3}
                        maxLength={NOTE_MAX}
                        value={review.note}
                        onChange={(event) => setReview({ ...review, note: event.target.value })}
                        placeholder={review.action === "approve" ? "Welcome aboard! …" : "Why it wasn't approved, and what would help next time…"}
                        disabled={isBusy}
                      />
                      <div className={styles.reviewActions}>
                        <button type="submit" className={review.action === "approve" ? "button button-small" : `icon-button icon-button-danger ${styles.rejectConfirm}`} disabled={isBusy}>
                          {review.action === "approve" ? (isBusy ? "Approving…" : "Approve & grant host access") : isBusy ? "Rejecting…" : "Reject request"}
                        </button>
                        <button type="button" className="icon-button" onClick={() => setReview(null)} disabled={isBusy}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={changePage} itemLabel="requests" disabled={status === "loading"} />
        </>
      )}
    </AdminShell>
  );
}

export default function AdminHostRequestsPage() {
  return (
    <AdminRoute>
      <HostRequestsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
