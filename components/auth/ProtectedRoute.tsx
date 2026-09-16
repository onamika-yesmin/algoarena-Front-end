"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { PageLoader } from "@/components/ui/Loader";

/**
 * Shown by the auth gates when the initial session check failed for a
 * reason other than "signed out" (e.g. the API cold-starting) — redirecting
 * to /signin then would wrongly treat a signed-in user as signed out.
 */
export function SessionErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="aa-page-loader" role="alert">
      <p>Couldn&apos;t verify your session.</p>
      <p className="form-error">{message}</p>
      <button type="button" className="button button-small" onClick={() => onRetry()}>
        Retry
      </button>
    </main>
  );
}

/**
 * Client-side auth gate. Renders children only once a signed-in session is
 * confirmed; otherwise shows a loader while the session check is in flight,
 * then redirects to /signin (preserving the original path and query string
 * so sign-in can bounce the user back where they were headed).
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, sessionError, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !sessionError) {
      const next = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
      router.replace(`/signin?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, user, sessionError, router]);

  if (!isLoading && !user && sessionError) {
    return <SessionErrorState message={sessionError} onRetry={retry} />;
  }

  if (isLoading || !user) {
    return <PageLoader label="Checking your session…" />;
  }

  return <>{children}</>;
}
