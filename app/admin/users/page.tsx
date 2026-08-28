"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listAdminUsers, updateAdminUser } from "@/lib/api/admin";
import type { AdminUser } from "@/types/api";
import { getErrorMessage } from "@/lib/api/client";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell, AdminErrorState, AdminEmptyState } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { IconSearch } from "@/components/admin/icons";

function AdminUsersContent() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    listAdminUsers({ search: search || undefined, limit: 100 })
      .then((result) => {
        setUsers(result.items);
        setStatus("ready");
      })
      .catch((requestError) => {
        setLoadErrorMessage(getErrorMessage(requestError, "Could not load users."));
        setStatus("error");
      });
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const applyUpdate = async (userId: string, payload: { role?: "user" | "admin"; status?: "active" | "blocked" }) => {
    setBusyId(userId);
    setError(null);
    try {
      const updated = await updateAdminUser(userId, payload);
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, ...updated } : item)));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update this user."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell eyebrow="PEOPLE / USERS" title="User manager" description="Promote trusted learners to admin, or block accounts that abuse the platform.">
      <div className="admin-toolbar">
        <div className="admin-toolbar-search">
          <IconSearch />
          <input placeholder="Search by name or email…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search users" />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {status === "loading" && <Loader label="Loading users…" />}
      {status === "error" && <AdminErrorState message={loadErrorMessage} onRetry={load} />}
      {status === "ready" && users.length === 0 && <AdminEmptyState message="No users match this search." />}

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
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === "admin" ? "badge-admin" : "badge-user"}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.status === "active" ? "badge-active" : "badge-blocked"}`}>{user.status}</span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {isSelf ? (
                        <span className="admin-cell-sub">(you)</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            disabled={busyId === user.id}
                            onClick={() => applyUpdate(user.id, { role: user.role === "admin" ? "user" : "admin" })}
                          >
                            {user.role === "admin" ? "Revoke admin" : "Make admin"}
                          </button>
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
    </AdminShell>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <AdminUsersContent />
      <SiteFooter />
    </AdminRoute>
  );
}
