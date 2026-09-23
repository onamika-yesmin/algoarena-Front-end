import type { NextConfig } from "next";

const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN ?? "https://algoarena-back-end.vercel.app").replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }, { protocol: "https", hostname: "*.googleusercontent.com" }, { protocol: "https", hostname: "res.cloudinary.com" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Required for Google Identity Services popup communication.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Baseline hardening. No Content-Security-Policy yet: Google
          // Identity Services and the Monaco editor both need a carefully
          // built script-src, and a wrong one silently breaks sign-in.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The app never asks for these; denying them up front means an
          // embedded third-party frame can't either.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg" },
      // Proxies browser API calls to the backend's own Vercel deployment
      // server-side, so the browser only ever talks to this app's origin.
      // See lib/config.ts for why: it keeps the session cookie first-party
      // instead of the browser treating it as a third-party cookie (which
      // is blocked by default in current browsers) across the frontend's
      // and backend's separate domains.
      // BACKEND_ORIGIN lets a developer point this proxy at a local API
      // without editing the file; the deployed default is unchanged.
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
