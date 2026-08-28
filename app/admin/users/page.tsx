"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listAdminUsers, updateAdminUser } from "@/lib/api/admin";
import type { AdminUser } from "@/types/api";
import { ApiError } from "@/lib/api/client";
import { Loader } from "@/components/ui/Loader";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

function AdminUsersContent() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus("loading");
    const timeout = setTimeout(() => {
      listAdminUsers({ search: search || undefined, limit: 100 })
        .then((result) => {
          setUsers(result.items);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const applyUpdate = async (userId: string, payload: { role?: "user" | "admin"; status?: "active" | "blocked" }) => {
    setBusyId(userId);
    setError(null);
    try {
      const updated = await updateAdminUser(userId, payload);
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, ...updated } : item)));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not update this user.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">PEOPLE / USERS</p>
          <h1>User manager</h1>
          <p>Promote trusted learners to admin, or block accounts that abuse the platform.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input placeholder="Search by name or email…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search users" />
        <Link className="text-link" href="/admin">
          ← Back to dashboard
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {status === "loading" && <Loader label="Loading users…" />}
      {status === "error" && <p className="problem-list-status">Could not load users.</p>}

      {status === "ready" && users.length > 0 && (
        <div className="admin-table-wrap submission-history">
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
                    <td>{user.name}</td>
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
                        <span className="problem-list-status" style={{ padding: 0 }}>
                          (you)
                        </span>
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
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <SiteHeader />
      <AdminUsersContent />
      <SiteFooter />
    </AdminRoute>
  );
}
