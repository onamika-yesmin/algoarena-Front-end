"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { PageLoader } from "@/components/ui/Loader";
import { SessionErrorState } from "@/components/auth/ProtectedRoute";

/**
 * Client-side admin gate. A signed-in non-admin is bounced to /profile with
 * an explanation instead of the raw admin UI ever rendering; a signed-out
 * visitor is sent to /signin first. The backend independently enforces
 * requireAdmin on every admin endpoint — this only controls what the UI
 * shows, it is not the security boundary.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, sessionError, retry } = useAuth();
  const router = useRouter();

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
    if (user.role !== "admin") {
      router.replace("/profile");
    }
  }, [isLoading, user, sessionError, router]);

  if (!isLoading && !user && sessionError) {
    return <SessionErrorState message={sessionError} onRetry={retry} />;
  }

  if (isLoading || !user || user.role !== "admin") {
    return <PageLoader label="Checking access…" />;
  }

  return <>{children}</>;
}
