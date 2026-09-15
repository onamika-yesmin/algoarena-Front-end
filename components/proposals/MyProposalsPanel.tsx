"use client";

// Profile section for problem proposals: what sending one costs, the learner's
// gem balance, the way in to propose a problem, and the proposals they've sent.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { deleteProposal, getMyProposals, type MyProposalsResult, type ProposalSummary } from "@/lib/api/proposals";
import { DifficultyTag, ProposalStatusBadge } from "./ProposalBadges";
import styles from "./MyProposalsPanel.module.css";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MyProposalsResult };

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

function ProposalRow({ proposal, isDeleting, onDelete }: { proposal: ProposalSummary; isDeleting: boolean; onDelete: () => void }) {
  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <Link href={`/profile/proposals/${proposal.id}`} className={styles.itemTitle}>
          {proposal.title}
        </Link>
        <div className={styles.itemMeta}>
          <DifficultyTag difficulty={proposal.difficulty} />
          <ProposalStatusBadge status={proposal.status} />
          <span className={styles.muted}>
            Sent {formatDate(proposal.submittedAt)} · {proposal.testCaseCount} {proposal.testCaseCount === 1 ? "test case" : "test cases"} ·{" "}
            {proposal.gemsSpent} gems spent{proposal.gemsRefunded ? `, ${proposal.gemsRefunded} refunded` : ""}
          </span>
        </div>
        {proposal.reviewNote && (
          <p className={styles.note}>
            <b>Note from the reviewer:</b> {proposal.reviewNote}
          </p>
        )}
        {proposal.status === "accepted" &&
          (proposal.problem?.isPublished ? (
            <p className={styles.accepted}>
              It&apos;s live in the problem library.{" "}
              <Link className="text-link" href={`/problems/${proposal.problem.slug}`}>
                Open the problem →
              </Link>
            </p>
          ) : (
            <p className={styles.accepted}>
              {proposal.problem ? "Added to the library — it goes live once an admin publishes it." : "Accepted by the admins."}
            </p>
          ))}
      </div>
      <div className={styles.itemActions}>
        <Link className="icon-button" href={`/profile/proposals/${proposal.id}`}>
          View
        </Link>
        {proposal.status !== "accepted" && (
          <>
            <Link className="icon-button" href={`/profile/proposals/${proposal.id}/edit`}>
              Edit
            </Link>
            <button type="button" className="icon-button icon-button-danger" disabled={isDeleting} onClick={onDelete}>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export function MyProposalsPanel({ isAdmin }: { isAdmin: boolean }) {
  const { refresh } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    getMyProposals()
      .then((data) => setState({ status: "ready", data }))
      .catch((requestError) => setState({ status: "error", message: getErrorMessage(requestError, "Could not load your proposals.") }));
  }, []);

  useEffect(load, [load]);

  const remove = async (proposal: ProposalSummary) => {
    const refundNote = proposal.status === "pending" ? " It hasn't been reviewed yet, so the gems it cost come back to you." : "";
    if (!window.confirm(`Delete your proposal "${proposal.title}"?${refundNote} This can't be undone.`)) return;
    setDeletingId(proposal.id);
    setFeedback(null);
    try {
      const result = await deleteProposal(proposal.id);
      setFeedback({
        tone: "success",
        text: `Deleted "${proposal.title}".${result.gemsRefunded ? ` ${result.gemsRefunded} gems were returned to you.` : ""}`,
      });
      // The site header shows the gem balance.
      if (result.gemsRefunded) void refresh();
    } catch (requestError) {
      setFeedback({
        tone: "error",
        text: requestError instanceof ApiError ? requestError.message : getErrorMessage(requestError, "Could not delete this proposal."),
      });
    } finally {
      setDeletingId(null);
      load();
    }
  };

  let body: React.ReactNode;
  if (state.status === "loading") {
    body = <p className={styles.muted}>Loading your proposals…</p>;
  } else if (state.status === "error") {
    body = (
      <div className={styles.cta}>
        <p className="form-error">{state.message}</p>
        <button type="button" className="icon-button" onClick={load}>
          Retry
        </button>
      </div>
    );
  } else {
    const { gems, cost, rejectRefund, maxPending, pendingCount, canPropose, items } = state.data;
    const enough = gems >= cost;
    const progress = Math.min(100, Math.round((gems / cost) * 100));
    body = (
      <>
        <p className={styles.locked}>
          Sending a proposal costs <b>{cost} gems</b>. If it&apos;s rejected, {rejectRefund} come back. If you delete it before it&apos;s reviewed, all {cost}{" "}
          come back. An accepted proposal keeps the full cost.
        </p>

        <div className={styles.meter}>
          <div className={styles.meterRow}>
            <span>
              <span className={styles.gems}>✦ {gems}</span> / {cost} gems
            </span>
            <span>{enough ? "Enough to send a proposal" : `${cost - gems} more to go`}</span>
          </div>
          <div
            className={`${styles.bar}${enough ? ` ${styles.barDone}` : ""}`}
            role="progressbar"
            aria-label="Gems toward sending a proposal"
            aria-valuemin={0}
            aria-valuemax={cost}
            aria-valuenow={Math.min(gems, cost)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.cta}>
          {canPropose ? (
            <Link className="button button-small" href="/profile/proposals/new">
              Propose a problem <span aria-hidden="true">→</span>
            </Link>
          ) : enough ? (
            <p className={styles.locked}>
              You have {pendingCount} proposals waiting for review — the most you can have at once is {maxPending}. You can send another once one is reviewed.
            </p>
          ) : (
            <>
              <p className={styles.locked}>
                Earn {cost - gems} more {cost - gems === 1 ? "gem" : "gems"} to send a proposal. You get gems for your first Accepted solution on each problem: Easy 10,
                Medium 20, Hard 30.
              </p>
              <Link className="text-link" href="/problems">
                Solve problems →
              </Link>
            </>
          )}
        </div>
        {isAdmin && (
          <p className={styles.adminNote}>
            As an admin you can also add problems directly in the{" "}
            <Link className="text-link" href="/admin/problems/new">
              problem manager
            </Link>
            .
          </p>
        )}

        {feedback && (
          <p className={feedback.tone === "success" ? "form-success" : "form-error"} role={feedback.tone === "error" ? "alert" : "status"}>
            {feedback.text}
          </p>
        )}

        {items.length === 0 ? (
          <p className={styles.empty}>You haven&apos;t proposed any problems yet.</p>
        ) : (
          <ul className={styles.list} aria-label="Your proposals">
            {items.map((proposal) => (
              <ProposalRow key={proposal.id} proposal={proposal} isDeleting={deletingId === proposal.id} onDelete={() => remove(proposal)} />
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <section id="proposals" className={`profile-panel ${styles.panel}`} aria-labelledby="proposals-title">
      <div>
        <span className="panel-kicker">PROBLEM PROPOSALS</span>
        <h2 id="proposals-title" className={styles.title}>
          Propose a problem for the library
        </h2>
        <p className={styles.lead}>
          Send the admins a problem of your own — statement, limits and test cases. If they accept it, it joins the AlgoArena problem library.
        </p>
      </div>
      {body}
    </section>
  );
}
