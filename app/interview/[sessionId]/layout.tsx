import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mock interview" };

export default function InterviewSessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
