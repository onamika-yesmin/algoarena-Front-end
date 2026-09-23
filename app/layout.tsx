import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { appConfig } from "@/lib/config";

const DESCRIPTION =
  "Practise algorithm problems against a real judge, get AI hints, a Big-O audit and refactor notes, then compete in live contests.";

export const metadata: Metadata = {
  // metadataBase resolves the relative URLs Next generates for Open Graph
  // and canonical tags; without it they are emitted as bare paths, which
  // most link previewers cannot follow.
  metadataBase: new URL(appConfig.appUrl || "https://algoarena-front-end.vercel.app"),
  // Every route was previously served with this one title, so open tabs were
  // indistinguishable. Each segment now sets its own and the template frames
  // it; `default` still covers the homepage and anything unnamed.
  title: {
    default: "AlgoArena | Build your coding edge",
    template: "%s | AlgoArena",
  },
  description: DESCRIPTION,
  applicationName: "AlgoArena",
  icons: { icon: "/icon.svg" },
  keywords: ["coding practice", "programming contests", "algorithm problems", "DSA practice", "mock interview"],
  openGraph: {
    title: "AlgoArena | Build your coding edge",
    description: DESCRIPTION,
    siteName: "AlgoArena",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "AlgoArena | Build your coding edge", description: DESCRIPTION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-scroll-behavior tells Next this page opts into the smooth scrolling
    // declared in globals.css, instead of Next silently disabling it during
    // route transitions (and warning that it will stop doing so).
    <html lang="en" data-scroll-behavior="smooth">
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
