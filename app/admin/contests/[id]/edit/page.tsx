"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { deriveContestStatus, getManagedContest, updateManagedContest, type CreateContestPayload } from "@/lib/api/contests";
import type { ManagedContestDetail, UserRole } from "@/types/api";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { ContestForm, setContestManagerFlash } from "@/components/admin/ContestForm";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import styles from "@/components/admin/ContestForm.module.css";

const MANAGER_ROLES: readonly UserRole[] = ["admin", "guest"];
// A guest asking for someone else's contest gets a 404; a malformed id may
// come back as 400. Either way there's nothing this user can edit.
const NOT_FOUND_STATUSES = new Set([400, 403, 404]);

const statusLabel: Record<string, string> = { UPCOMING: "Upcoming", ONGOING: "Live now", ENDED: "Ended" };

function EditContestContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [contest, setContest] = useState<ManagedContestDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const submittingRef = useRef(false);
  const latestRequestRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    setStatus("loading");
    getManagedContest(params.id)
      .then((data) => {
        if (requestId !== latestRequestRef.current) return;
        setContest(data);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestId !== latestRequestRef.current) return;
        if (requestError instanceof ApiError && NOT_FOUND_STATUSES.has(requestError.statusCode)) {
          setStatus("not-found");
          return;
        }
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load this contest."));
        setStatus("error");
      });
  }, [params.id]);

  useEffect(load, [load]);

  const submit = async (payload: CreateContestPayload) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateManagedContest(params.id, payload);
      setContestManagerFlash(`Saved changes to "${updated?.title ?? payload.title ?? contest?.title ?? "the contest"}".`);
      // Stays in the submitting state until the list page replaces this one.
      router.push("/admin/contests");
    } catch (requestError) {
      submittingRef.current = false;
      setIsSubmitting(false);
      if (requestError instanceof ApiError && requestError.statusCode === 404) {
        setStatus("not-found");
        return;
      }
      setError(getErrorMessage(requestError, "Could not save the contest."));
    }
  };

  const eyebrow = isAdmin ? "COMPETITION / EDIT CONTEST" : "HOST PANEL / EDIT CONTEST";

  if (status === "loading") {
    return (
      <AdminShell eyebrow={eyebrow} title="Loading…">
        <Loader label="Loading contest…" />
      </AdminShell>
    );
  }

  if (status === "not-found") {
    return (
      <AdminShell eyebrow={eyebrow} title="Contest not found">
        <AdminEmptyState
          message={
            <>
              This contest doesn&apos;t exist, or it isn&apos;t one of yours{isAdmin ? "" : " — hosts can only edit contests they created"}.{" "}
              <Link className="text-link" href="/admin/contests">
                ← Back to contests
              </Link>
            </>
          }
        />
      </AdminShell>
    );
  }

  if (status === "error" || !contest) {
    return (
      <AdminShell eyebrow={eyebrow} title="Edit contest">
        <AdminErrorState message={loadErrorMessage} onRetry={load} />
        <p style={{ marginTop: 16 }}>
          <Link className="text-link" href="/admin/contests">
            ← Back to contests
          </Link>
        </p>
      </AdminShell>
    );
  }

  const liveStatus = deriveContestStatus(contest, now);
  const registered = `${contest.participantCount} ${contest.participantCount === 1 ? "participant" : "participants"}`;

  return (
    <AdminShell
      eyebrow={eyebrow}
      title={contest.title}
      description={
        <span className={styles.headMeta}>
          <span className={`pill pill-contest-${liveStatus.toLowerCase()}`}>{statusLabel[liveStatus] ?? liveStatus}</span>
          {!contest.isPublished && <span className="badge badge-draft">Draft</span>}
          <span>{registered} registered</span>
          {isAdmin && contest.createdBy && <span>Hosted by {contest.createdBy.name}</span>}
        </span>
      }
      actions={
        <Link className="button-outline button-small" href={`/contest/${contest.slug}`}>
          View contest <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {liveStatus === "ONGOING" && (
        <p className={styles.notice}>
          <b>This contest is live.</b> Changes apply immediately for its {registered} — take care when changing the window or the problem set.
        </p>
      )}
      {liveStatus === "ENDED" && <p className={styles.notice}>This contest has already ended. Moving its end time into the future would reopen it.</p>}

      <div className="admin-card">
        <h2>Contest details</h2>
        <p className="admin-card-hint">Update anything below, then save.</p>
        <ContestForm
          key={contest.id}
          initial={contest}
          isAdmin={isAdmin}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={submit}
          cancelHref="/admin/contests"
        />
      </div>
    </AdminShell>
  );
}

export default function EditContestPage() {
  return (
    <AdminRoute allowRoles={MANAGER_ROLES}>
      <EditContestContent />
      <SiteFooter />
    </AdminRoute>
  );
}
