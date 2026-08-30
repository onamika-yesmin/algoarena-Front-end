import Link from "next/link";
import type { ProblemSummary } from "@/types/api";

const difficultyClass: Record<ProblemSummary["difficulty"], string> = {
  EASY: "pill-easy",
  MEDIUM: "pill-medium",
  HARD: "pill-hard",
};

export default function ProblemCard({ problem }: { problem: ProblemSummary }) {
  return (
    <Link href={`/problems/${problem.slug}`} className="problem-card">
      <div className="problem-card-top">
        <span className={`pill ${difficultyClass[problem.difficulty]}`}>{problem.difficulty}</span>
        {problem.solvedByMe && <span className="pill pill-solved">Solved</span>}
      </div>
      <h3>{problem.title}</h3>
      <div className="problem-card-tags">
        {problem.tags.slice(0, 4).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="problem-card-foot">
        <span>{problem.basePoints} pts</span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}
