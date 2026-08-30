import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

export const metadata: Metadata = {
  title: "AlgoArena | Build your coding edge",
  description: "Practice problems, compete in live contests, and grow with AlgoArena.",
  applicationName: "AlgoArena",
  icons: { icon: "/icon.svg" },
  keywords: ["coding practice", "programming contests", "algorithm problems"],
  openGraph: {
    title: "AlgoArena | Build your coding edge",
    description: "Practice problems, compete in live contests, and grow with AlgoArena.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Scroll-reveal sections (hooks/useReveal.ts) start hidden and fade
            in via JS. If JavaScript never runs, this forces them visible
            instead of leaving real content permanently invisible. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
