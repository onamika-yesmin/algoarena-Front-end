import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mock interviews" };

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
