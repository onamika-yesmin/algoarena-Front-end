"use client";

// Shared layout for every /admin/* page: the marketing SiteHeader stays (so
// sign-out and brand nav are always reachable), plus a persistent sidebar
// for the control-room sections and a consistent page head (eyebrow, title,
// description, optional actions). Replaces each page repeating its own
// <main className="dashboard-shell"> + manual header markup.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { useAuth } from "@/providers/AuthProvider";
import type { UserRole } from "@/types/api";
import { IconGrid, IconCode, IconUsers, IconTrophy, IconAlert, IconInbox, IconRefresh } from "./icons";

// Each section carries its own icon accent (see .admin-nav-item.accent-*
// in globals.css) instead of every active item turning the same cyan —
// same 4-color mapping reused by the overview stat cards and quick-link
// cards so a section reads as the same color everywhere it appears.
// `roles` lists who can use a section: guest contest hosts only ever see the
// contest manager (the backend enforces the same split on every endpoint).
const NAV_ITEMS: { href: string; label: string; icon: typeof IconGrid; exact: boolean; accent: string; roles: readonly UserRole[] }[] = [
  { href: "/admin", label: "Overview", icon: IconGrid, exact: true, accent: "orange", roles: ["admin"] },
  { href: "/admin/problems", label: "Problems", icon: IconCode, exact: false, accent: "cyan", roles: ["admin"] },
  { href: "/admin/users", label: "Users", icon: IconUsers, exact: false, accent: "violet", roles: ["admin"] },
  { href: "/admin/contests", label: "Contests", icon: IconTrophy, exact: false, accent: "green", roles: ["admin", "guest"] },
  { href: "/admin/host-requests", label: "Host requests", icon: IconInbox, exact: false, accent: "orange", roles: ["admin"] },
];

interface AdminShellProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminShell({ eyebrow, title, description, actions, children }: AdminShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role: UserRole = user?.role ?? "user";
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      <SiteHeader />
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <p className="admin-sidebar-kicker">{role === "guest" ? "Host panel" : "Control room"}</p>
          <nav aria-label="Admin sections">
            {navItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item accent-${item.accent}${isActive ? " is-active" : ""}`}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/" className="admin-sidebar-exit">
            ← Back to site
          </Link>
        </aside>

        <main className="admin-main">
          <div className="admin-main-head">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              {description && <p className="admin-main-desc">{description}</p>}
            </div>
            {actions && <div className="admin-main-actions">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </>
  );
}

/** Consistent "load failed" banner with the real error message and a retry button. */
export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="admin-state admin-state-error">
      <IconAlert />
      <div>
        <p className="admin-state-title">Couldn&apos;t load this.</p>
        <p className="admin-state-detail">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="icon-button" onClick={onRetry}>
          <IconRefresh /> Retry
        </button>
      )}
    </div>
  );
}

/** Consistent empty-list state. */
export function AdminEmptyState({ message }: { message: ReactNode }) {
  return (
    <div className="admin-state admin-state-empty">
      <IconInbox />
      <p className="admin-state-detail">{message}</p>
    </div>
  );
}

/**
 * Shape-matched loading placeholders for the stat grid and data tables, so a
 * page settles into its real layout instead of jumping from a centered
 * spinner to a full table once data arrives.
 */
export function AdminStatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="admin-skeleton-stats" role="status" aria-label="Loading stats">
      {Array.from({ length: count }).map((_, index) => (
        <div className="admin-skeleton-stat" key={index}>
          <span className="aa-skeleton" />
          <span className="aa-skeleton" />
          <span className="aa-skeleton" />
        </div>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="admin-skeleton-table" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="admin-skeleton-row" key={index}>
          <span className="aa-skeleton" />
          <span className="aa-skeleton" />
          <span className="aa-skeleton" />
          <span className="aa-skeleton" />
        </div>
      ))}
    </div>
  );
}
