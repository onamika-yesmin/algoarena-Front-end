"use client";

// Profile section for problem proposals: how close the learner is to the gem
// threshold, the way in to propose a problem, and the proposals they've sent.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
            Sent {formatDate(proposal.submittedAt)} · {proposal.testCaseCount} {proposal.testCaseCount === 1 ? "test case" : "test cases"}
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
    if (!window.confirm(`Delete your proposal "${proposal.title}"? This can't be undone.`)) return;
    setDeletingId(proposal.id);
    setFeedback(null);
    try {
      await deleteProposal(proposal.id);
      setFeedback({ tone: "success", text: `Deleted "${proposal.title}".` });
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
    const { gems, requiredGems, maxPending, pendingCount, canPropose, items } = state.data;
    const unlocked = gems >= requiredGems;
    const progress = Math.min(100, Math.round((gems / requiredGems) * 100));
    body = (
      <>
        <div className={styles.meter}>
          <div className={styles.meterRow}>
            <span>
              <span className={styles.gems}>✦ {gems}</span> / {requiredGems} gems
            </span>
            <span>{unlocked ? "Unlocked" : `${requiredGems - gems} more to go`}</span>
          </div>
          <div
            className={`${styles.bar}${unlocked ? ` ${styles.barDone}` : ""}`}
            role="progressbar"
            aria-label="Gems toward proposing a problem"
            aria-valuemin={0}
            aria-valuemax={requiredGems}
            aria-valuenow={Math.min(gems, requiredGems)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.cta}>
          {canPropose ? (
            <Link className="button button-small" href="/profile/proposals/new">
              Propose a problem <span aria-hidden="true">→</span>
            </Link>
          ) : unlocked ? (
            <p className={styles.locked}>
              You have {pendingCount} proposals waiting for review — the most you can have at once is {maxPending}. You can send another once one is reviewed.
            </p>
          ) : (
            <>
              <p className={styles.locked}>
                Earn {requiredGems - gems} more {requiredGems - gems === 1 ? "gem" : "gems"} to unlock this. You get gems for your first Accepted solution on each problem:
                Easy 10, Medium 20, Hard 30.
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
          With 50 or more gems you can send the admins a problem of your own — statement, limits and test cases. If they accept it, it joins the AlgoArena
          problem library. Proposing doesn&apos;t use up any gems.
        </p>
      </div>
      {body}
    </section>
  );
}
