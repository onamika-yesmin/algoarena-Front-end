"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listAdminUsers, updateAdminUser } from "@/lib/api/admin";
import type { AdminUser, UserRole } from "@/types/api";
import { getErrorMessage } from "@/lib/api/client";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState, AdminTableSkeleton } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { IconSearch } from "@/components/admin/icons";
import { PageLoader } from "@/components/ui/Loader";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

// "?page=3" → 3; a missing or malformed value → page 1.
const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

const ROLE_FILTERS: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "All roles" },
  { value: "user", label: "Users" },
  { value: "guest", label: "Hosts" },
  { value: "admin", label: "Admins" },
];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "guest", label: "Host (guest)" },
  { value: "admin", label: "Admin" },
];

// globals.css has badge-user/badge-admin but nothing for hosts, so the guest
// badge carries its own cyan tint (the site's accent for "can host").
const ROLE_BADGES: Record<UserRole, { label: string; className: string; style?: CSSProperties; title?: string }> = {
  user: { label: "User", className: "badge badge-user" },
  guest: {
    label: "Host",
    className: "badge",
    style: { background: "rgba(85,216,210,.14)", color: "var(--cyan, #55d8d2)" },
    title: "Guest — an approved contest host who can manage their own contests",
  },
  admin: { label: "Admin", className: "badge badge-admin" },
};

// .admin-toolbar styles its input but has no select counterpart; these mirror
// that input (toolbar filter) and .icon-button (per-row role selector).
const filterSelectStyle: CSSProperties = {
  border: "1px solid #3d4673",
  background: "#0d1020",
  color: "#fff",
  padding: "10px 13px",
  font: "13px Manrope",
  borderRadius: 7,
};
const roleSelectStyle: CSSProperties = {
  border: "1px solid #3d4673",
  background: "#0d1020",
  color: "#c3c8dd",
  padding: "5px 8px",
  font: "11px Manrope",
  borderRadius: 4,
  cursor: "pointer",
};

function AdminUsersContent() {
  const { user: me } = useAuth();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only the most recent load's response is applied, so a slower response
  // for an older search, filter or page can't overwrite newer results.
  const latestRequestRef = useRef(0);
  // The search text the last load used — only a change to it waits out the
  // typing debounce; a page/filter change or a post-action reload loads right away.
  const loadedSearchRef = useRef(search);

  // The page lives in the URL (?page=3) so a refresh keeps it. Next.js syncs
  // History API updates into useSearchParams without a server round trip.
  // "replace" is for corrections (search/filter reset, stepping back off an
  // emptied page) that shouldn't leave a history entry.
  const goToPage = useCallback((nextPage: number, mode: "push" | "replace" = "push") => {
    const url = new URL(window.location.href);
    if (nextPage > 1) url.searchParams.set("page", String(nextPage));
    else url.searchParams.delete("page");
    if (url.href === window.location.href) return;
    const target = `${url.pathname}${url.search}${url.hash}`;
    if (mode === "push") window.history.pushState(null, "", target);
    else window.history.replaceState(null, "", target);
  }, []);

  // `silent` keeps the current rows on screen (no skeleton) — used to refresh
  // the page after a role/status change.
  const load = useCallback(
    ({ silent = false }: { silent?: boolean } = {}) => {
      const requestId = ++latestRequestRef.current;
      loadedSearchRef.current = search;
      if (!silent) setStatus("loading");
      return listAdminUsers({ search: search || undefined, role: roleFilter || undefined, page, limit: PAGE_SIZE })
        .then((result) => {
          if (requestId !== latestRequestRef.current) return;
          // Past the last page — e.g. the only admin left on it was just
          // demoted under the Admins filter, or the URL has a stale ?page= —
          // so step back rather than show an empty table.
          if (result.items.length === 0 && result.total > 0 && page > 1) {
            setStatus("loading");
            goToPage(Math.min(page - 1, Math.ceil(result.total / PAGE_SIZE)), "replace");
            return;
          }
          setUsers(result.items);
          setTotal(result.total);
          setStatus("ready");
        })
        .catch((requestError) => {
          if (requestId !== latestRequestRef.current) return;
          setLoadErrorMessage(getErrorMessage(requestError, "Could not load users."));
          setStatus("error");
        });
    },
    [search, roleFilter, page, goToPage],
  );

  useEffect(() => {
    const timeout = setTimeout(() => load(), loadedSearchRef.current === search ? 0 : 250);
    return () => clearTimeout(timeout);
  }, [load, search]);

  const changeSearch = (value: string) => {
    setSearch(value);
    goToPage(1, "replace");
  };

  const changeRoleFilter = (value: UserRole | "") => {
    setRoleFilter(value);
    goToPage(1, "replace");
  };

  const applyUpdate = async (userId: string, payload: { role?: UserRole; status?: AdminUser["status"] }) => {
    setBusyId(userId);
    setError(null);
    try {
      const updated = await updateAdminUser(userId, payload);
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, ...updated } : item)));
      // Refresh the page: under a role filter the user may no longer belong here.
      await load({ silent: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update this user."));
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (target: AdminUser, nextRole: UserRole) => {
    if (nextRole === target.role) return;
    // Admin is full control of the platform, so promoting needs a second yes.
    // Cancelling leaves the controlled select on the user's current role.
    if (nextRole === "admin" && !window.confirm(`Make ${target.name} an admin? Admins can manage every problem, contest and user.`)) return;
    void applyUpdate(target.id, { role: nextRole });
  };

  const emptyMessage = search ? "No users match this search." : roleFilter ? "No users have this role." : "No users yet.";

  return (
    <AdminShell
      eyebrow="PEOPLE / USERS"
      title="User manager"
      description="Choose who can host contests or administer the platform, and block accounts that abuse it."
    >
      <div className="admin-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
          <div className="admin-toolbar-search">
            <IconSearch />
            <input placeholder="Search by name or email…" value={search} onChange={(event) => changeSearch(event.target.value)} aria-label="Search users" />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => changeRoleFilter(event.target.value as UserRole | "")}
            aria-label="Filter by role"
            style={filterSelectStyle}
          >
            {ROLE_FILTERS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {status === "ready" && (
          <span className="admin-toolbar-count">
            {total} {total === 1 ? "user" : "users"}
          </span>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {status === "loading" && <AdminTableSkeleton rows={6} />}
      {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={() => load()} />}
      {status === "ready" && users.length === 0 && <AdminEmptyState message={emptyMessage} />}

      {status === "ready" && users.length > 0 && (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = me && (me.id ?? me._id) === user.id;
                const badge = ROLE_BADGES[user.role] ?? { label: user.role, className: "badge badge-user" };
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-cell-user">
                        <span className="admin-cell-avatar">
                          {user.profilePicUrl ? (
                            <Image src={user.profilePicUrl} alt="" width={30} height={30} />
                          ) : (
                            user.name.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="admin-cell-name">{user.name}</span>
                      </div>
                    </td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Role">
                      <span className={badge.className} style={badge.style} title={badge.title}>
                        {badge.label}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${user.status === "active" ? "badge-active" : "badge-blocked"}`}>{user.status}</span>
                    </td>
                    <td data-label="Joined">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="admin-cell-actions">
                      {isSelf ? (
                        <span className="admin-cell-sub">(you)</span>
                      ) : (
                        <>
                          <select
                            value={user.role}
                            disabled={busyId === user.id}
                            onChange={(event) => changeRole(user, event.target.value as UserRole)}
                            aria-label={`Role for ${user.name}`}
                            style={{ ...roleSelectStyle, ...(busyId === user.id ? { opacity: 0.5, cursor: "not-allowed" } : null) }}
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="icon-button icon-button-danger"
                            disabled={busyId === user.id}
                            onClick={() => applyUpdate(user.id, { status: user.status === "blocked" ? "active" : "blocked" })}
                          >
                            {user.status === "blocked" ? "Unblock" : "Block"}
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
      )}

      {status !== "error" && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(nextPage) => goToPage(nextPage)} itemLabel="users" disabled={status === "loading" || busyId !== null} />
      )}
    </AdminShell>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      {/* useSearchParams (the ?page= above) needs a Suspense boundary for static prerendering. */}
      <Suspense fallback={<PageLoader label="Loading users…" />}>
        <AdminUsersContent />
      </Suspense>
      <SiteFooter />
    </AdminRoute>
  );
}
