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
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
