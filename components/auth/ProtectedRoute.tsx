"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { PageLoader } from "@/components/ui/Loader";

/**
 * Client-side auth gate. Renders children only once a signed-in session is
 * confirmed; otherwise shows a loader while the session check is in flight,
 * then redirects to /signin (preserving the original path so sign-in can
 * bounce the user back where they were headed).
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(`/signin?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <PageLoader label="Checking your session…" />;
  }

  return <>{children}</>;
}
