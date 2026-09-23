import type { Metadata } from "next";

export const metadata: Metadata = { title: "Problem proposals" };

export default function ProposalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
