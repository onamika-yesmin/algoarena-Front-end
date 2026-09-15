"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { deleteProposal, getProposal, PROPOSAL_REJECT_REFUND_GEMS, type ProposalDetail } from "@/lib/api/proposals";
import { ProposalDetails } from "@/components/proposals/ProposalDetails";
import { DifficultyTag, ProposalStatusBadge } from "@/components/proposals/ProposalBadges";
import { Loader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import styles from "../proposals.module.css";

type LoadState = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; proposal: ProposalDetail };

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

function StatusCard({ proposal }: { proposal: ProposalDetail }) {
  const reviewed = formatDateTime(proposal.reviewedAt);
  const note = proposal.reviewNote && (
    <p className={styles.reviewNote}>
      <b>Note from the reviewer:</b> {proposal.reviewNote}
    </p>
  );

  if (proposal.status === "accepted") {
    return (
      <div className={`${styles.card} ${styles.accepted}`}>
        <h2>Accepted — thank you!</h2>
        {proposal.problem?.isPublished ? (
          <>
            <p>Your problem is live in the AlgoArena problem library. An accepted proposal keeps its full gem cost.</p>
            {note}
            <Link className="button button-small" href={`/problems/${proposal.problem.slug}`}>
              Open the problem <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <>
            <p>
              {proposal.problem ? "It's in the problem library as a draft and goes live once an admin publishes it." : "An admin accepted this proposal."} An
              accepted proposal keeps its full gem cost.
            </p>
            {note}
          </>
        )}
      </div>
    );
  }

  if (proposal.status === "rejected") {
    return (
      <div className={`${styles.card} ${styles.rejected}`}>
        <h2>Not accepted this time</h2>
        <p>
          {reviewed ? `Reviewed on ${reviewed}. ` : ""}
          {PROPOSAL_REJECT_REFUND_GEMS} gems came back to you. You can improve it and send it again — that puts it back in the review queue and costs the gems
          again — or delete it.
        </p>
        {note}
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.pending}`}>
      <h2>Waiting for review</h2>
      <p>
        Sent {formatDateTime(proposal.submittedAt) ?? "recently"}. An admin will accept it into the library or send it back with a note. Until then you can still
        edit it, or delete it and get the gems it cost back.
      </p>
    </div>
  );
}

function ProposalContent() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const { refresh } = useAuth();
  const searchParams = useSearchParams();
  const notice = searchParams?.get("sent") === "1" ? "Proposal sent! An admin will review it soon." : searchParams?.get("saved") === "1" ? "Changes saved." : null;

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState<{ gemsRefunded: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    getProposal(id)
      .then((proposal) => setState({ status: "ready", proposal }))
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.statusCode === 404) setState({ status: "missing" });
        else setState({ status: "error", message: getErrorMessage(requestError, "Could not load this proposal.") });
      });
  }, [id]);

  useEffect(load, [load]);

  const remove = async (proposal: ProposalDetail) => {
    const refundNote = proposal.status === "pending" ? " It hasn't been reviewed yet, so the gems it cost come back to you." : "";
    if (!window.confirm(`Delete your proposal "${proposal.title}"?${refundNote} This can't be undone.`)) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      const result = await deleteProposal(proposal.id);
      setDeleted({ gemsRefunded: result.gemsRefunded });
      // The site header shows the gem balance.
      if (result.gemsRefunded) void refresh();
    } catch (requestError) {
      setActionError(requestError instanceof ApiError ? requestError.message : getErrorMessage(requestError, "Could not delete this proposal."));
      load();
    } finally {
      setIsDeleting(false);
    }
  };

  let body: React.ReactNode;
  if (deleted) {
    body = (
      <div className={styles.card} role="status">
        <h2>Proposal deleted</h2>
        <p>
          It&apos;s gone for good.{deleted.gemsRefunded ? ` ${deleted.gemsRefunded} gems were returned to you.` : ""}
        </p>
        <div className={styles.actions}>
          <Link className="button button-small" href="/profile#proposals">
            Back to your proposals <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    );
  } else if (state.status === "loading") {
    body = (
      <div className={styles.card}>
        <Loader label="Loading proposal…" />
      </div>
    );
  } else if (state.status === "missing") {
    body = (
      <div className={styles.card}>
        <h2>Proposal not found</h2>
        <p>It may have been deleted, or it belongs to someone else.</p>
        <Link className="button button-small" href="/profile#proposals">
          Back to your proposals <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else if (state.status === "error") {
    body = (
      <div className={styles.card} role="alert">
        <h2>Couldn&apos;t load this proposal</h2>
        <p className="form-error">{state.message}</p>
        <button type="button" className="button button-small" onClick={load}>
          Retry
        </button>
      </div>
    );
  } else {
    const { proposal } = state;
    const editable = proposal.status !== "accepted";
    body = (
      <>
        {notice && (
          <p className="form-success" role="status">
            {notice}
          </p>
        )}
        {actionError && (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        )}
        <StatusCard proposal={proposal} />
        <div className={`${styles.card} ${styles.formCard}`}>
          <div className={styles.meta}>
            <ProposalStatusBadge status={proposal.status} />
            <DifficultyTag difficulty={proposal.difficulty} />
            <span className={styles.muted}>Last updated {formatDateTime(proposal.updatedAt)}</span>
            <span className={styles.muted}>
              · {proposal.gemsSpent} gems spent{proposal.gemsRefunded ? `, ${proposal.gemsRefunded} refunded` : ""}
            </span>
          </div>
          <h2>{proposal.title}</h2>
          {editable && (
            <div className={styles.actions}>
              <Link className="button button-small" href={`/profile/proposals/${proposal.id}/edit`}>
                {proposal.status === "rejected" ? "Edit and send again" : "Edit proposal"}
              </Link>
              <button type="button" className="icon-button icon-button-danger" disabled={isDeleting} onClick={() => remove(proposal)}>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
          <ProposalDetails proposal={proposal} />
        </div>
      </>
    );
  }

  return (
    <main className={`section-shell workspace ${styles.page}`}>
      <Link className={`text-link ${styles.back}`} href="/profile#proposals">
        ← Back to your profile
      </Link>
      <p className="eyebrow">
        <b />
        YOUR PROPOSAL
      </p>
      <h1>{state.status === "ready" && !deleted ? state.proposal.title : "Problem proposal"}</h1>
      <div className={styles.stack}>{body}</div>
    </main>
  );
}

export default function ProposalPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <Suspense fallback={null}>
        <ProposalContent />
      </Suspense>
      <SiteFooter />
    </ProtectedRoute>
  );
}
