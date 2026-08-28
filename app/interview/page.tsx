"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../_components/home/SiteHeader";
import { SiteFooter } from "../_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader } from "@/components/ui/Loader";
import { ApiError } from "@/lib/api/client";
import {
  listInterviewSessions,
  startInterviewSession,
  type InterviewDifficulty,
  type InterviewSessionSummary,
} from "@/lib/api/interview";
import styles from "./interview.module.css";

const TOPICS = [
  { value: "arrays", label: "Arrays" },
  { value: "strings", label: "Strings" },
  { value: "dynamic-programming", label: "Dynamic Programming" },
  { value: "graphs", label: "Graphs" },
  { value: "general", label: "General" },
];

const DIFFICULTIES: { value: InterviewDifficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

function InterviewContent() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [topic, setTopic] = useState(TOPICS[0].value);
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("EASY");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    listInterviewSessions()
      .then(setSessions)
      .catch((error) => setListError(error instanceof ApiError ? error.message : "Could not load your past interviews."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsStarting(true);
    setStartError(null);
    try {
      const session = await startInterviewSession({ topic, difficulty });
      router.push(`/interview/${session.id}`);
    } catch (error) {
      setStartError(error instanceof ApiError ? error.message : "Could not start the interview. Try again.");
      setIsStarting(false);
    }
  };

  return (
    <main className="section-shell workspace">
      <section>
        <p className="eyebrow">
          <b />
          MOCK INTERVIEW
        </p>
        <h1>Practice a live coding interview.</h1>
        <p>Talk through a problem the way you would with a real interviewer — an AI interviewer asks the questions, listens to your answers, and gives you feedback at the end.</p>
      </section>

      <section className={styles.startPanel}>
        <h2 className={styles.startPanelTitle}>Start a new mock interview</h2>
        <p className={styles.startPanelSubtitle}>Pick a topic and difficulty, then jump straight into the conversation.</p>
        <form className={styles.startForm} onSubmit={handleStart}>
          <div className={styles.formField}>
            <label htmlFor="interview-topic">Topic</label>
            <select id="interview-topic" value={topic} onChange={(event) => setTopic(event.target.value)} disabled={isStarting}>
              {TOPICS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor="interview-difficulty">Difficulty</label>
            <select
              id="interview-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as InterviewDifficulty)}
              disabled={isStarting}
            >
              {DIFFICULTIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={styles.startButton} disabled={isStarting}>
            {isStarting ? "Starting…" : "Start interview"}
          </button>
        </form>
        {startError && <p className={styles.formError}>{startError}</p>}
      </section>

      <h2 className={styles.sectionTitle}>Past interviews</h2>
      {isLoading ? (
        <Loader label="Loading your interviews…" />
      ) : listError ? (
        <p className={styles.formError}>{listError}</p>
      ) : sessions.length === 0 ? (
        <div className={styles.emptyPanel}>No interviews yet — start one above.</div>
      ) : (
        <div className={styles.sessionList}>
          {sessions.map((session) => (
            <Link key={session.id} href={`/interview/${session.id}`} className={styles.sessionCard}>
              <div className={styles.sessionInfo}>
                <span className={styles.sessionTopic}>{session.topic.replace(/-/g, " ")}</span>
                <span className={styles.sessionMeta}>
                  <span
                    className={`${styles.badge} ${session.status === "completed" ? styles.badgeCompleted : styles.badgeInProgress}`}
                  >
                    {session.status === "completed" ? "Completed" : "In progress"}
                  </span>
                  <span>{session.difficulty}</span>
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
              {typeof session.score === "number" && <span className={styles.scoreTag}>Score {session.score}/10</span>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function InterviewPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <InterviewContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
