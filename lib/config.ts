const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const appConfig = {
  // Defaults to "" (a relative path) rather than the backend's absolute
  // URL. The frontend and backend are deployed as two separate Vercel
  // projects on two different domains, so a direct cross-site fetch makes
  // the auth cookie a *third-party* cookie — which Chrome and other
  // browsers increasingly block by default. Login would appear to
  // succeed (the POST goes through) but the cookie never actually gets
  // stored, so the very next request looks signed-out again.
  //
  // Routing through "" means every API call hits this app's own origin
  // (e.g. /api/auth/me), which next.config.ts rewrites server-side to the
  // real backend. The browser only ever talks to one origin, so the
  // cookie is first-party and persists normally. Set NEXT_PUBLIC_API_URL
  // to override this (e.g. for local development against a backend that
  // isn't proxied).
  apiUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? ""),
  socketUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://algoarena-back-end.vercel.app"),
  appUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? "https://algoarena-front-end.vercel.app"),
};
