import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your analytics" };

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
