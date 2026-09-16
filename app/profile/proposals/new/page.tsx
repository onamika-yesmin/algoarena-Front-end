"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { createProposal, getMyProposals, type MyProposalsResult, type ProposalInput } from "@/lib/api/proposals";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import { Loader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import styles from "../proposals.module.css";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MyProposalsResult };

function NewProposalContent() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setState({ status: "loading" });
    getMyProposals()
      .then((data) => setState({ status: "ready", data }))
      .catch((requestError) => setState({ status: "error", message: getErrorMessage(requestError, "Could not check your gems.") }));
  }, []);

  useEffect(load, [load]);

  const submit = async (input: ProposalInput) => {
    if (state.status !== "ready") return;
    const { gems, cost, rejectRefund } = state.data;
    if (!window.confirm(`Send this proposal for ${cost} gems? You have ${gems}. If it's rejected, ${rejectRefund} gems come back to you.`)) return;
    setError(null);
    try {
      const created = await createProposal(input);
      // The site header shows the gem balance.
      void refresh();
      router.push(`/profile/proposals/${created.id}?sent=1`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : getErrorMessage(requestError, "Could not send your proposal. Please try again."));
      window.scrollTo({ top: 0, behavior: "smooth" });
      // The gem balance or the pending count may have changed since the page loaded.
      if (requestError instanceof ApiError && (requestError.statusCode === 403 || requestError.statusCode === 409)) load();
    }
  };

  let body: React.ReactNode;
  if (state.status === "loading") {
    body = (
      <div className={styles.card}>
        <Loader label="Checking your gems…" />
      </div>
    );
  } else if (state.status === "error") {
    body = (
      <div className={styles.card} role="alert">
        <h2>Couldn&apos;t check your gems</h2>
        <p className="form-error">{state.message}</p>
        <button type="button" className="button button-small" onClick={load}>
          Retry
        </button>
      </div>
    );
  } else if (!state.data.canPropose) {
    const { gems, cost, pendingCount, maxPending } = state.data;
    body = (
      <div className={`${styles.card} ${styles.pending}`}>
        {error && <p className="form-error">{error}</p>}
        {gems < cost ? (
          <>
            <h2>Sending a proposal costs {cost} gems</h2>
            <p>
              You have {gems} {gems === 1 ? "gem" : "gems"}. You earn gems the first time you get an Accepted solution on a problem — Easy 10, Medium 20, Hard 30.
            </p>
            <Link className="button button-small" href="/problems">
              Solve problems <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <>
            <h2>Your proposals are waiting for review</h2>
            <p>
              You have {pendingCount} proposals waiting — the most you can have at once is {maxPending}. You can send another as soon as an admin reviews one.
            </p>
            <Link className="button button-small" href="/profile#proposals">
              See your proposals <span aria-hidden="true">→</span>
            </Link>
          </>
        )}
      </div>
    );
  } else {
    const { gems, cost, rejectRefund } = state.data;
    body = (
      <div className={`${styles.card} ${styles.formCard}`}>
        <p className={styles.reviewNote}>
          <b>Cost: {cost} gems.</b> You have {gems}. The gems are taken when you send the proposal. If it&apos;s rejected you get {rejectRefund} back, if you
          delete it before it&apos;s reviewed you get all {cost} back, and an accepted proposal keeps the full cost.
        </p>
        <ProposalForm submitLabel="Send proposal" submittingLabel="Sending proposal…" cancelHref="/profile#proposals" error={error} onSubmit={submit} />
      </div>
    );
  }

  return (
    <main className={`section-shell workspace ${styles.page}`}>
      <Link className={`text-link ${styles.back}`} href="/profile#proposals">
        ← Back to your profile
      </Link>
      <p className="eyebrow">
        <b />
        PROPOSE A PROBLEM
      </p>
      <h1>Propose a problem</h1>
      <p className={styles.lead}>
        Write the problem the way learners will see it, add test cases, and send it to the admins. If they accept it, it joins the AlgoArena problem library.
      </p>
      <div className={styles.stack}>{body}</div>
    </main>
  );
}

export default function NewProposalPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <NewProposalContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
