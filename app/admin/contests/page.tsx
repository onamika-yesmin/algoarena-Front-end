"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createContest, deleteManagedContest, deriveContestStatus, listManagedContests, type CreateContestPayload } from "@/lib/api/contests";
import type { ManagedContestSummary, UserRole } from "@/types/api";
import { getErrorMessage } from "@/lib/api/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { ContestForm, takeContestManagerFlash } from "@/components/admin/ContestForm";
import { Pagination } from "@/components/ui/Pagination";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { IconSearch } from "@/components/admin/icons";
import styles from "@/components/admin/ContestForm.module.css";

const PAGE_SIZE = 20;
const STATUS_TICK_MS = 30_000;
const MANAGER_ROLES: readonly UserRole[] = ["admin", "guest"];

const statusLabel: Record<string, string> = { UPCOMING: "Upcoming", ONGOING: "Live now", ENDED: "Ended" };

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const roleBadgeClass = (role: UserRole) => (role === "admin" ? "badge badge-admin" : role === "guest" ? `badge ${styles.badgeGuest}` : "badge badge-user");

function AdminContestsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [contests, setContests] = useState<ManagedContestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [formKey, setFormKey] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ title: string; slug: string } | null>(null);
  const creatingRef = useRef(false);

  // Only the most recent load's response is applied, so a slower response
  // for an older search/page can't overwrite newer results.
  const latestRequestRef = useRef(0);

  // "Saved changes to …" handed over by the edit page.
  useEffect(() => {
    const flash = takeContestManagerFlash();
    if (flash) setListMessage({ tone: "success", text: flash });
  }, []);

  // Keeps the Upcoming → Live → Ended pills moving without a reload.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STATUS_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const next = search.trim();
    if (next === query) return;
    const timeout = setTimeout(() => {
      setQuery(next);
      setPage(1);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, query]);

  const load = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    setStatus("loading");
    listManagedContests({ page, limit: PAGE_SIZE, search: query || undefined })
      .then((result) => {
        if (requestId !== latestRequestRef.current) return;
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
        // e.g. the only contest on the last page was just deleted.
        if (result.items.length === 0 && page > lastPage) {
          setPage(lastPage);
          return;
        }
        setContests(result.items);
        setTotal(result.total);
        setNow(Date.now());
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestId !== latestRequestRef.current) return;
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load contests."));
        setStatus("error");
      });
  }, [page, query]);

  useEffect(load, [load]);

  const handleCreate = async (payload: CreateContestPayload) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setIsCreating(true);
    setCreateError(null);
    setCreated(null);
    try {
      await createContest(payload);
      setCreated({ title: payload.title, slug: payload.slug });
      setFormKey((key) => key + 1); // remounts the form empty
      load();
    } catch (requestError) {
      setCreateError(getErrorMessage(requestError, "Could not create the contest."));
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  const remove = async (contest: ManagedContestSummary) => {
    const registrations =
      contest.participantCount === 0
        ? "its registrations (none so far)"
        : contest.participantCount === 1
          ? "its 1 registration"
          : `all ${contest.participantCount} of its registrations`;
    if (!window.confirm(`Delete "${contest.title}"?\n\nThis permanently deletes the contest and removes ${registrations}. This can't be undone.`)) return;
    setBusyId(contest.id);
    setListMessage(null);
    try {
      await deleteManagedContest(contest.id);
      setListMessage({ tone: "success", text: `Deleted "${contest.title}".` });
      load();
    } catch (requestError) {
      setListMessage({ tone: "error", text: getErrorMessage(requestError, "Could not delete the contest.") });
    } finally {
      setBusyId(null);
    }
  };

  const showTable = contests.length > 0 && status !== "error";

  return (
    <AdminShell
      eyebrow={isAdmin ? "COMPETITION / CONTESTS" : "HOST PANEL / CONTESTS"}
      title={isAdmin ? "Contest manager" : "Your contests"}
      description={
        isAdmin
          ? "Schedule contests, pick their problems, and manage every contest on the platform — including the ones hosts run."
          : "Create and manage your own contests: set the window, pick problems from the library, and keep an eye on registrations."
      }
    >
      <div className="admin-card">
        <h2>Schedule a new contest</h2>
        <p className="admin-card-hint">Set the window and pick the problems now — you can edit everything later.</p>
        {created && (
          <p className={`form-success ${styles.flash}`} role="status">
            Contest &ldquo;{created.title}&rdquo; created.
            <Link className="text-link" href={`/contest/${created.slug}`}>
              View it <span aria-hidden="true">→</span>
            </Link>
          </p>
        )}
        <ContestForm
          key={formKey}
          isAdmin={isAdmin}
          submitLabel="Create contest"
          submittingLabel="Creating…"
          isSubmitting={isCreating}
          error={createError}
          onSubmit={handleCreate}
        />
      </div>

      <div className="admin-card">
        <h2>{isAdmin ? "All contests" : "Contests you host"}</h2>
        <div className="admin-toolbar" style={{ marginTop: 12 }}>
          <div className="admin-toolbar-search">
            <IconSearch />
            <input type="search" placeholder="Search contests…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search contests" />
          </div>
          {status === "ready" && (
            <span className="admin-toolbar-count">
              {total} {total === 1 ? "contest" : "contests"}
            </span>
          )}
        </div>

        <div aria-live="polite">
          {listMessage && (
            <p className={`${listMessage.tone === "success" ? "form-success" : "form-error"} ${styles.flash}`} role={listMessage.tone === "error" ? "alert" : "status"}>
              {listMessage.text}
            </p>
          )}
        </div>

        {status === "loading" && contests.length === 0 && <AdminTableSkeleton rows={4} />}
        {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={load} />}
        {status === "ready" && contests.length === 0 && (
          <AdminEmptyState
            message={
              query
                ? `No contests match "${query}".`
                : isAdmin
                  ? "No contests yet — create the first one above."
                  : "You haven't created any contests yet — schedule your first one above."
            }
          />
        )}

        {showTable && (
          <>
            <div className="admin-table-wrap" aria-busy={status === "loading"} style={{ opacity: status === "loading" ? 0.6 : 1, transition: "opacity .15s" }}>
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Window</th>
                    <th>Problems</th>
                    <th>Participants</th>
                    {isAdmin && <th>Host</th>}
                    <th>
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map((contest) => {
                    const liveStatus = deriveContestStatus(contest, now);
                    const isBusy = busyId === contest.id;
                    return (
                      <tr key={contest.id}>
                        <td className="admin-cell-name">
                          {contest.title}
                          {!contest.isPublished && <span className={`badge badge-draft ${styles.titleBadge}`}>Draft</span>}
                          <span className="admin-cell-sub">/{contest.slug}</span>
                        </td>
                        <td data-label="Status">
                          <span className={`pill pill-contest-${liveStatus.toLowerCase()}`}>{statusLabel[liveStatus] ?? liveStatus}</span>
                        </td>
                        <td data-label="Window">
                          {formatDateTime(contest.startTime)}
                          <span className="admin-cell-sub">to {formatDateTime(contest.endTime)}</span>
                        </td>
                        <td data-label="Problems">{contest.problemCount}</td>
                        <td data-label="Participants">{contest.participantCount}</td>
                        {isAdmin && (
                          <td data-label="Host">
                            {contest.createdBy ? (
                              <>
                                {contest.createdBy.name}{" "}
                                <span className={`${roleBadgeClass(contest.createdBy.role)} ${styles.titleBadge}`}>
                                  {contest.createdBy.role === "guest" ? "host" : contest.createdBy.role}
                                </span>
                              </>
                            ) : (
                              <span className="admin-cell-sub">—</span>
                            )}
                          </td>
                        )}
                        <td className="admin-cell-actions">
                          <Link className="icon-button" href={`/contest/${contest.slug}`} aria-label={`View ${contest.title}`}>
                            View
                          </Link>
                          {contest.canEdit && (
                            <>
                              <Link className="icon-button" href={`/admin/contests/${contest.id}/edit`} aria-label={`Edit ${contest.title}`}>
                                Edit
                              </Link>
                              <button
                                type="button"
                                className="icon-button icon-button-danger"
                                disabled={isBusy}
                                onClick={() => remove(contest)}
                                aria-label={`Delete ${contest.title}`}
                              >
                                {isBusy ? "Deleting…" : "Delete"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} itemLabel="contests" disabled={status === "loading"} />
          </>
        )}
      </div>
    </AdminShell>
  );
}

export default function AdminContestsPage() {
  return (
    <AdminRoute allowRoles={MANAGER_ROLES}>
      <AdminContestsContent />
      <SiteFooter />
    </AdminRoute>
  );
}
