"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import {
  getProposal,
  PROPOSAL_COST_GEMS,
  PROPOSAL_REJECT_REFUND_GEMS,
  updateProposal,
  type ProposalDetail,
  type ProposalInput,
} from "@/lib/api/proposals";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import { Loader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import styles from "../../proposals.module.css";

type LoadState = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; proposal: ProposalDetail };

function EditProposalContent() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getProposal(id)
      .then((proposal) => setState({ status: "ready", proposal }))
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.statusCode === 404) setState({ status: "missing" });
        else setState({ status: "error", message: getErrorMessage(requestError, "Could not load this proposal.") });
      });
  }, [id]);

  useEffect(load, [load]);

  const submit = async (input: ProposalInput) => {
    // Sending a rejected proposal back for review costs the gems again.
    const resubmit = state.status === "ready" && state.proposal.status === "rejected";
    if (
      resubmit &&
      !window.confirm(`Send it back for review for ${PROPOSAL_COST_GEMS} gems? If it's rejected again, ${PROPOSAL_REJECT_REFUND_GEMS} gems come back to you.`)
    ) {
      return;
    }
    setError(null);
    try {
      await updateProposal(id, input);
      if (resubmit) void refresh();
      router.push(`/profile/proposals/${id}?saved=1`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : getErrorMessage(requestError, "Could not save your changes. Please try again."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  let body: React.ReactNode;
  if (state.status === "loading") {
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
  } else if (state.proposal.status === "accepted") {
    body = (
      <div className={`${styles.card} ${styles.accepted}`}>
        <h2>This proposal was accepted</h2>
        <p>It&apos;s already part of the problem library, so it can&apos;t be edited any more.</p>
        <Link className="button button-small" href={`/profile/proposals/${id}`}>
          View the proposal <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else {
    const { proposal } = state;
    body = (
      <>
        {proposal.status === "rejected" && (
          <div className={`${styles.card} ${styles.rejected}`}>
            <h2>Saving sends it back for review</h2>
            <p>
              This proposal wasn&apos;t accepted last time. Improve it below — when you save, it goes back into the review queue. That counts as sending it
              again, so it costs {PROPOSAL_COST_GEMS} gems{typeof user?.gems === "number" ? ` (you have ${user.gems})` : ""}.
            </p>
            {proposal.reviewNote && (
              <p className={styles.reviewNote}>
                <b>Note from the reviewer:</b> {proposal.reviewNote}
              </p>
            )}
          </div>
        )}
        <div className={`${styles.card} ${styles.formCard}`}>
          <ProposalForm
            key={proposal.updatedAt}
            initial={proposal}
            submitLabel={proposal.status === "rejected" ? `Save and send for review (${PROPOSAL_COST_GEMS} gems)` : "Save changes"}
            submittingLabel="Saving…"
            cancelHref={`/profile/proposals/${id}`}
            error={error}
            onSubmit={submit}
          />
        </div>
      </>
    );
  }

  return (
    <main className={`section-shell workspace ${styles.page}`}>
      <Link className={`text-link ${styles.back}`} href={`/profile/proposals/${id}`}>
        ← Back to the proposal
      </Link>
      <p className="eyebrow">
        <b />
        EDIT PROPOSAL
      </p>
      <h1>{state.status === "ready" ? state.proposal.title : "Edit proposal"}</h1>
      <div className={styles.stack}>{body}</div>
    </main>
  );
}

export default function EditProposalPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <EditProposalContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
