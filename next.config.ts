import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }, { protocol: "https", hostname: "*.googleusercontent.com" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Required for Google Identity Services popup communication.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
      { source: "/api/:path*", destination: "https://algoarena-back-end.vercel.app/api/:path*" },
    ];
  },
};

export default nextConfig;
