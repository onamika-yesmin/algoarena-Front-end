"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, AUTH_EXPIRED_EVENT, getErrorMessage } from "@/lib/api/client";
import { getCurrentUser, logout as logoutRequest } from "@/lib/api/auth";
import { clearTokens, getRefreshToken } from "@/lib/auth-storage";
import type { CurrentUser } from "@/types/api";

interface AuthContextValue {
  user: CurrentUser | null;
  /** True only while the initial session check (or a retry() of it) is in
   *  flight — background refresh() calls never flip it, so auth gates don't
   *  unmount the page they wrap just to re-check the session. */
  isLoading: boolean;
  /** Set when the initial session check failed for a reason other than
   *  "signed out" (a 503 cold start, a network error) — the user may well
   *  still be signed in, so auth gates offer retry() instead of redirecting. */
  sessionError: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Whether a failed /me call really means "signed out". A 403 is a blocked
// account. A 401 is too — unless a refresh token is still stored: the API
// client only keeps it after a 401 when the refresh itself failed for a
// transient reason (network error, 5xx), i.e. the session couldn't be
// verified rather than being rejected.
const isSignedOutError = (error: unknown) =>
  error instanceof ApiError && (error.statusCode === 403 || (error.statusCode === 401 && !getRefreshToken()));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const loadSession = useCallback(async (isInitialCheck: boolean) => {
    if (isInitialCheck) {
      setIsLoading(true);
      setSessionError(null);
    }
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setSessionError(null);
    } catch (error) {
      if (isSignedOutError(error)) {
        setUser(null);
        setSessionError(null);
      } else {
        console.error("Failed to load session:", error);
        // A background refresh keeps whoever was signed in — a blip
        // shouldn't sign them out. The initial check has no previous user
        // to fall back on, so it surfaces the error for a retry instead.
        if (isInitialCheck) setSessionError(getErrorMessage(error));
      }
    } finally {
      if (isInitialCheck) setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => loadSession(false), [loadSession]);
  const retry = useCallback(() => loadSession(true), [loadSession]);

  useEffect(() => {
    void loadSession(true);
  }, [loadSession]);

  // The API client fires this once a token refresh was definitively rejected
  // and it has wiped the stored tokens — the session is over.
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setSessionError(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, sessionError, refresh, retry, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
