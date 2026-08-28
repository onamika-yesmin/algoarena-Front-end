"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { PageLoader } from "@/components/ui/Loader";

/**
 * Client-side admin gate. A signed-in non-admin is bounced to /profile with
 * an explanation instead of the raw admin UI ever rendering; a signed-out
 * visitor is sent to /signin first. The backend independently enforces
 * requireAdmin on every admin endpoint — this only controls what the UI
 * shows, it is not the security boundary.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(`/signin?next=${encodeURIComponent(next)}`);
      return;
    }
    if (user.role !== "admin") {
      router.replace("/profile");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "admin") {
    return <PageLoader label="Checking access…" />;
  }

  return <>{children}</>;
}
