// Typed fetch wrapper for the AlgoArena backend. Always sends the httpOnly
// session cookie (credentials: "include") so the Express backend's
// requireAuth/optionalAuth middleware can identify the caller.

import { appConfig } from "@/lib/config";
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
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${appConfig.apiUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let payload: ApiResponse<T> | undefined;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON response (e.g. a proxy error page) still needs a message.
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message ?? `Request failed (${response.status}).`, response.status);
  }

  return payload.data;
}
