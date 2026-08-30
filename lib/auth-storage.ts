// Local persistence for the JWT access/refresh tokens, used as a fallback
// authentication path alongside (not instead of) the backend's httpOnly
// cookies.
//
// Why this exists: the frontend and backend are deployed as two separate
// Vercel projects on two different domains. Browsers increasingly block
// cross-site cookies by default (Chrome's third-party cookie phase-out,
// Safari's ITP, etc.), so even with a same-origin API proxy in front of it,
// relying on cookies alone has proven fragile in practice. Storing the
// tokens here and sending them as `Authorization: Bearer <token>` (see
// lib/api/client.ts) guarantees the session works regardless of the
// browser's cookie policy — the backend's requireAuth/optionalAuth
// middleware already accept either a cookie or a Bearer header.
//
// localStorage access is wrapped in try/catch: it can throw in private
// browsing modes or when the user has disabled site data.

const ACCESS_TOKEN_KEY = "algoarena.accessToken";
const REFRESH_TOKEN_KEY = "algoarena.refreshToken";

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // Storage unavailable — the session will still work via cookies if the
    // browser allows them.
  }
};

export const clearTokens = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing to do — already inaccessible.
  }
};
