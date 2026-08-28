// Typed fetch wrapper for the AlgoArena backend. Sends the httpOnly session
// cookie (credentials: "include") AND, when available, an `Authorization:
// Bearer <token>` header built from lib/auth-storage.ts — the backend's
// requireAuth/optionalAuth middleware accept either. The Bearer header is
// the fallback that keeps sessions working when the cookie doesn't reach
// the server (e.g. a browser blocking cross-site cookies, even through the
// same-origin proxy in next.config.ts) — see lib/auth-storage.ts for why.

import { appConfig } from "@/lib/config";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth-storage";
import type { ApiResponse } from "@/types/api";

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Internal: marks a request as already-retried, to avoid a refresh loop. */
  _isRetry?: boolean;
}

const REFRESH_PATH = "/api/auth/refresh";

// Concurrent 401s share one in-flight refresh instead of each firing their
// own — otherwise several failed requests on the same page (e.g. /me plus a
// couple of data calls) would each race to refresh the token.
let refreshInFlight: Promise<boolean> | null = null;

const tryRefresh = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${appConfig.apiUrl}${REFRESH_PATH}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = (await response.json().catch(() => undefined)) as
          | ApiResponse<{ accessToken: string; refreshToken: string }>
          | undefined;
        if (!response.ok || !payload?.success || !payload.data) return false;
        setTokens(payload.data.accessToken, payload.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${appConfig.apiUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: Object.keys(headers).length ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let payload: ApiResponse<T> | undefined;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON response (e.g. a proxy error page) still needs a message.
  }

  if (response.status === 401 && !options._isRetry && path !== REFRESH_PATH) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiRequest<T>(path, { ...options, _isRetry: true });
    clearTokens();
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message ?? `Request failed (${response.status}).`, response.status);
  }

  return payload.data;
}
