import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Quiz System | AlgoArena",
  description:
    "Test your algorithmic knowledge with interactive, AI-verified code prediction, complexity analysis, and dynamic quiz sessions.",
};

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
