import type { Metadata } from "next";

export const metadata: Metadata = { title: "Problems" };

export default function ProblemsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
