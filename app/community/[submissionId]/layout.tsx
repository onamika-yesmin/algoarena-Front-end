import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shared solution" };

export default function CommunitySolutionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
