"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getCurrentUser, logout as logoutRequest } from "@/lib/api/auth";
import { clearTokens } from "@/lib/auth-storage";
import type { CurrentUser } from "@/types/api";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // 401 just means signed out; anything else, fail quietly to "signed out".
      if (!(error instanceof ApiError) || error.statusCode !== 401) {
        console.error("Failed to load session:", error);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
