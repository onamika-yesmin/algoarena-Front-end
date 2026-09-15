"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import {
  getProposal,
  listProposals,
  PROPOSAL_COST_GEMS,
  PROPOSAL_LIMITS,
  PROPOSAL_REJECT_REFUND_GEMS,
  reviewProposal,
  slugifyTitle,
  type ProposalDetail,
  type ProposalStatusFilter,
  type ProposalSummary,
  type ReviewProposalPayload,
} from "@/lib/api/proposals";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { Pagination } from "@/components/ui/Pagination";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProposalDetails } from "@/components/proposals/ProposalDetails";
import { DifficultyTag, ProposalStatusBadge } from "@/components/proposals/ProposalBadges";
import styles from "./proposals.module.css";

const PAGE_SIZE = 20;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALREADY_REVIEWED_MESSAGE = "This proposal has already been reviewed.";

const TABS: { value: ProposalStatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const EMPTY_MESSAGE: Record<ProposalStatusFilter, string> = {
  pending: "No proposals waiting — you're all caught up.",
  accepted: "No accepted proposals yet.",
  rejected: "No rejected proposals.",
  all: "Nobody has proposed a problem yet.",
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

type Review = { id: string; action: "accept" | "reject"; note: string; slug: string; basePoints: string; publish: boolean };
type DetailState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; proposal: ProposalDetail };
type Feedback = { tone: "success" | "error"; text: string; problemId?: string };

function ProposalsContent() {
  const baseId = useId();
  const [tab, setTab] = useState<ProposalStatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProposalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [review, setReview] = useState<Review | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Only the most recent load's response is applied, so a slower response
  // for an older tab/page can't overwrite newer results.
  const latestRequestRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    setStatus("loading");
    listProposals({ status: tab, page, limit: PAGE_SIZE })
      .then((result) => {
        if (requestId !== latestRequestRef.current) return;
        setPendingCount(result.pendingCount);
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
        // e.g. the last proposal on the last page was just reviewed away.
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
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load proposals."));
        setStatus("error");
      });
  }, [tab, page]);

  useEffect(load, [load]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [feedback]);

  const changeTab = (next: ProposalStatusFilter) => {
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

  // Always re-fetched on open: the author may have edited the proposal since.
  const loadDetail = (id: string) => {
    setDetails((current) => ({ ...current, [id]: { status: "loading" } }));
    getProposal(id)
      .then((proposal) => setDetails((current) => ({ ...current, [id]: { status: "ready", proposal } })))
      .catch((requestError) =>
        setDetails((current) => ({ ...current, [id]: { status: "error", message: getErrorMessage(requestError, "Could not load this proposal.") } })),
      );
  };

  const toggleExpanded = (id: string) => {
    const open = !expanded[id];
    setExpanded((current) => ({ ...current, [id]: open }));
    if (open) loadDetail(id);
  };

  const openReview = (proposal: ProposalSummary, action: Review["action"]) => {
    setFeedback(null);
    setReviewError(null);
    setReview((current) =>
      current?.id === proposal.id
        ? { ...current, action }
        : { id: proposal.id, action, note: "", slug: slugifyTitle(proposal.title), basePoints: "100", publish: false },
    );
  };

  const submitReview = async (event: React.FormEvent<HTMLFormElement>, proposal: ProposalSummary) => {
    event.preventDefault();
    if (!review || review.id !== proposal.id || busyId) return;
    const note = review.note.trim();
    if (note.length > PROPOSAL_LIMITS.reviewNoteMax) return;

    let payload: ReviewProposalPayload = { action: review.action, note: note || undefined };
    if (review.action === "accept") {
      const slug = review.slug.trim().toLowerCase();
      if (slug && (slug.length < PROPOSAL_LIMITS.slugMin || slug.length > PROPOSAL_LIMITS.slugMax || !SLUG_PATTERN.test(slug))) {
        setReviewError(`The slug must be ${PROPOSAL_LIMITS.slugMin}–${PROPOSAL_LIMITS.slugMax} lowercase letters or numbers separated by single hyphens, like two-sum.`);
        return;
      }
      const points = review.basePoints.trim();
      if (!/^\d+$/.test(points) || Number(points) > PROPOSAL_LIMITS.pointsMax) {
        setReviewError(`Base points must be a whole number from 0 to ${PROPOSAL_LIMITS.pointsMax}.`);
        return;
      }
      payload = { ...payload, slug: slug || undefined, basePoints: Number(points), publish: review.publish };
    } else if (
      !window.confirm(`Reject "${proposal.title}"${proposal.user ? ` by ${proposal.user.name}` : ""}? The author gets ${PROPOSAL_REJECT_REFUND_GEMS} gems back.`)
    ) {
      return;
    }

    setBusyId(proposal.id);
    setFeedback(null);
    setReviewError(null);
    try {
      const reviewed = await reviewProposal(proposal.id, payload);
      setFeedback(
        review.action === "accept"
          ? {
              tone: "success",
              text: `Accepted — "${reviewed.title}" was added to the problem library${reviewed.problem?.isPublished ? " and published" : " as a draft"}.`,
              problemId: reviewed.problem?.id,
            }
          : {
              tone: "success",
              text: `Rejected "${reviewed.title}". ${reviewed.user?.name ?? "The author"} got ${PROPOSAL_REJECT_REFUND_GEMS} gems back and can edit it and send it again.`,
            },
      );
      setReview(null);
      load();
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : getErrorMessage(requestError, "Could not review this proposal.");
      if (message === ALREADY_REVIEWED_MESSAGE) {
        // Someone else got there first — show the current state.
        setFeedback({ tone: "error", text: message });
        setReview(null);
        load();
      } else {
        // e.g. the slug is taken: keep the panel open so it can be fixed.
        setReviewError(message);
      }
    } finally {
      setBusyId(null);
    }
  };

  const showList = items.length > 0 && status !== "error";

  return (
    <AdminShell
      eyebrow="CONTENT / PROPOSALS"
      title="Problem proposals"
      description={`Problems suggested by learners — sending one costs its author ${PROPOSAL_COST_GEMS} gems. Accepting adds it to the problem library with all its test cases (as a draft, unless you publish it right away) and keeps the full cost; rejecting gives the author ${PROPOSAL_REJECT_REFUND_GEMS} gems back.`}
    >
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Filter proposals by status">
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
            {total} {total === 1 ? "proposal" : "proposals"}
          </span>
        )}
      </div>

      <div aria-live="polite" ref={feedbackRef}>
        {feedback && (
          <p className={`${feedback.tone === "success" ? "form-success" : "form-error"} ${styles.feedback}`} role={feedback.tone === "error" ? "alert" : "status"}>
            {feedback.text}
            {feedback.problemId && (
              <>
                {" "}
                <Link className="text-link" href={`/admin/problems/${feedback.problemId}/edit`}>
                  Open in the problem manager →
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {status === "loading" && items.length === 0 && <AdminTableSkeleton rows={5} />}
      {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={load} />}
      {status === "ready" && items.length === 0 && <AdminEmptyState message={EMPTY_MESSAGE[tab]} />}

      {showList && (
        <>
          <ul className={`${styles.list}${status === "loading" ? ` ${styles.isBusy}` : ""}`} aria-busy={status === "loading"}>
            {items.map((proposal) => {
              const isExpanded = Boolean(expanded[proposal.id]);
              const detail = details[proposal.id];
              const isReviewing = review?.id === proposal.id;
              const isBusy = busyId === proposal.id;
              const detailsId = `${baseId}-details-${proposal.id}`;
              const fieldId = (key: string) => `${baseId}-${proposal.id}-${key}`;
              const reviewed = formatDateTime(proposal.reviewedAt);
              return (
                <li key={proposal.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div className={styles.requester}>
                      <span className="admin-cell-avatar" aria-hidden="true">
                        {(proposal.user?.name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div className={styles.requesterText}>
                        <span className="admin-cell-name">{proposal.user?.name ?? "Deleted user"}</span>
                        {proposal.user?.email && <span className="admin-cell-sub">{proposal.user.email}</span>}
                      </div>
                    </div>
                    <ProposalStatusBadge status={proposal.status} />
                  </div>

                  <h2 className={styles.title}>{proposal.title}</h2>
                  <div className={styles.meta}>
                    <DifficultyTag difficulty={proposal.difficulty} />
                    {proposal.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <dl className={styles.facts}>
                    <div>
                      <dt>Test cases</dt>
                      <dd>
                        {proposal.testCaseCount} ({proposal.sampleCount} {proposal.sampleCount === 1 ? "sample" : "samples"})
                      </dd>
                    </div>
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDateTime(proposal.submittedAt) ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Gems</dt>
                      <dd>
                        {proposal.gemsSpent} spent{proposal.gemsRefunded ? ` · ${proposal.gemsRefunded} refunded` : ""}
                      </dd>
                    </div>
                    {reviewed && (
                      <div>
                        <dt>Reviewed</dt>
                        <dd>{reviewed}</dd>
                      </div>
                    )}
                    {proposal.problem && (
                      <div>
                        <dt>Problem</dt>
                        <dd>
                          /{proposal.problem.slug} · {proposal.problem.isPublished ? "Published" : "Draft"}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {proposal.noteToReviewer && (
                    <p className={styles.note}>
                      <b>Note from the author:</b> {proposal.noteToReviewer}
                    </p>
                  )}
                  {proposal.reviewNote && (
                    <p className={styles.note}>
                      <b>Review note:</b> {proposal.reviewNote}
                    </p>
                  )}

                  <div className={styles.cardActions}>
                    <button type="button" className="icon-button" aria-expanded={isExpanded} aria-controls={detailsId} onClick={() => toggleExpanded(proposal.id)}>
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>
                    {proposal.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className={`icon-button ${styles.acceptButton}`}
                          disabled={isBusy}
                          aria-pressed={isReviewing && review?.action === "accept"}
                          onClick={() => openReview(proposal, "accept")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-danger"
                          disabled={isBusy}
                          aria-pressed={isReviewing && review?.action === "reject"}
                          onClick={() => openReview(proposal, "reject")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {proposal.problem && (
                      <Link className="icon-button" href={`/admin/problems/${proposal.problem.id}/edit`}>
                        Open in problem manager
                      </Link>
                    )}
                  </div>

                  {isExpanded && (
                    <div id={detailsId} className={styles.details}>
                      {(!detail || detail.status === "loading") && <p className={styles.muted}>Loading proposal…</p>}
                      {detail?.status === "error" && (
                        <div className={styles.cardActions}>
                          <p className="form-error">{detail.message}</p>
                          <button type="button" className="icon-button" onClick={() => loadDetail(proposal.id)}>
                            Retry
                          </button>
                        </div>
                      )}
                      {detail?.status === "ready" && <ProposalDetails proposal={detail.proposal} />}
                    </div>
                  )}

                  {isReviewing && review && proposal.status === "pending" && (
                    <form
                      className={`${styles.review} ${review.action === "accept" ? styles.reviewAccept : styles.reviewReject}`}
                      onSubmit={(event) => submitReview(event, proposal)}
                    >
                      <p className={styles.reviewTitle}>
                        {review.action === "accept" ? `Accept "${proposal.title}" into the problem library?` : `Reject "${proposal.title}"?`}
                      </p>
                      {review.action === "accept" && (
                        <>
                          <p className={styles.reviewHint}>
                            Creates the problem with all {proposal.testCaseCount} test cases ({proposal.sampleCount} shown as {proposal.sampleCount === 1 ? "a sample" : "samples"}).
                            You can still change anything in the problem manager afterwards. The author&apos;s {PROPOSAL_COST_GEMS} gems are not refunded.
                          </p>
                          <div className={styles.reviewRow}>
                            <label htmlFor={fieldId("slug")} className={styles.field}>
                              <span>Slug</span>
                              <input
                                id={fieldId("slug")}
                                value={review.slug}
                                maxLength={PROPOSAL_LIMITS.slugMax}
                                onChange={(event) => setReview({ ...review, slug: event.target.value })}
                                placeholder="two-sum"
                                disabled={isBusy}
                              />
                              <span className={styles.fieldHint}>/problems/{review.slug.trim() || "…"} — leave empty to build it from the title.</span>
                            </label>
                            <label htmlFor={fieldId("points")} className={styles.field}>
                              <span>Base points</span>
                              <input
                                id={fieldId("points")}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={PROPOSAL_LIMITS.pointsMax}
                                value={review.basePoints}
                                onChange={(event) => setReview({ ...review, basePoints: event.target.value })}
                                disabled={isBusy}
                              />
                            </label>
                          </div>
                          <label className={styles.check}>
                            <input type="checkbox" checked={review.publish} onChange={(event) => setReview({ ...review, publish: event.target.checked })} disabled={isBusy} />
                            Publish right away (otherwise it&apos;s added as a draft)
                          </label>
                        </>
                      )}
                      {review.action === "reject" && (
                        <p className={styles.reviewHint}>
                          The author gets {PROPOSAL_REJECT_REFUND_GEMS} of their {PROPOSAL_COST_GEMS} gems back and can edit the proposal and send it again.
                        </p>
                      )}
                      <label htmlFor={fieldId("note")} className={styles.noteLabel}>
                        <span>Note to the author (optional)</span>
                        <span className={styles.counter}>
                          {review.note.length}/{PROPOSAL_LIMITS.reviewNoteMax}
                        </span>
                      </label>
                      <textarea
                        id={fieldId("note")}
                        rows={3}
                        maxLength={PROPOSAL_LIMITS.reviewNoteMax}
                        value={review.note}
                        onChange={(event) => setReview({ ...review, note: event.target.value })}
                        placeholder={review.action === "accept" ? "Thanks — a great problem!" : "What would make it acceptable next time…"}
                        disabled={isBusy}
                      />
                      {reviewError && (
                        <p className="form-error" role="alert">
                          {reviewError}
                        </p>
                      )}
                      <div className={styles.reviewActions}>
                        <button
                          type="submit"
                          className={review.action === "accept" ? "button button-small" : `icon-button icon-button-danger ${styles.rejectConfirm}`}
                          disabled={isBusy}
                        >
                          {review.action === "accept" ? (isBusy ? "Accepting…" : "Accept & add to library") : isBusy ? "Rejecting…" : "Reject proposal"}
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
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={changePage} itemLabel="proposals" disabled={status === "loading"} />
        </>
      )}
    </AdminShell>
  );
}

export default function AdminProposalsPage() {
  return (
    <AdminRoute>
      <ProposalsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
