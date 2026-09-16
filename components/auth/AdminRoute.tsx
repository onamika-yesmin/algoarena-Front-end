"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { PageLoader } from "@/components/ui/Loader";
import { SessionErrorState } from "@/components/auth/ProtectedRoute";
import type { UserRole } from "@/types/api";

const ADMIN_ONLY: readonly UserRole[] = ["admin"];

/**
 * Client-side gate for /admin pages. `allowRoles` defaults to admins only; the
 * contest manager pages also admit "guest" contest hosts. A signed-in user
 * without access is bounced — a guest to their contest manager, anyone else
 * to /profile — instead of the raw admin UI ever rendering; a signed-out
 * visitor is sent to /signin first. The backend independently enforces the
 * same roles on every endpoint — this only controls what the UI shows, it is
 * not the security boundary.
 */
export function AdminRoute({ children, allowRoles = ADMIN_ONLY }: { children: React.ReactNode; allowRoles?: readonly UserRole[] }) {
  const { user, isLoading, sessionError, retry } = useAuth();
  const router = useRouter();
  const hasAccess = Boolean(user && allowRoles.includes(user.role));

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // Couldn't verify the session (not the same as signed out) — the
      // retry state below handles it instead of a redirect.
      if (sessionError) return;
      const next = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
      router.replace(`/signin?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!hasAccess) {
      router.replace(user.role === "guest" ? "/admin/contests" : "/profile");
    }
  }, [isLoading, user, hasAccess, sessionError, router]);

  if (!isLoading && !user && sessionError) {
    return <SessionErrorState message={sessionError} onRetry={retry} />;
  }

  if (isLoading || !user || !hasAccess) {
    return <PageLoader label="Checking access…" />;
  }

  return <>{children}</>;
}
