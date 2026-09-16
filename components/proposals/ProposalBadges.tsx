import type { Difficulty } from "@/types/api";
import { PROPOSAL_STATUS_BADGE, PROPOSAL_STATUS_LABEL, type ProposalStatus } from "@/lib/api/proposals";
import styles from "./ProposalBadges.module.css";

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  EASY: styles.easy,
  MEDIUM: styles.medium,
  HARD: styles.hard,
};

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  return <span className={`${styles.difficulty} ${DIFFICULTY_CLASS[difficulty]}`}>{difficulty}</span>;
}

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <span className={PROPOSAL_STATUS_BADGE[status]}>{PROPOSAL_STATUS_LABEL[status]}</span>;
}
