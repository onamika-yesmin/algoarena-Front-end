"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../_components/home/SiteHeader";
import { SiteFooter } from "../_components/home/SiteFooter";
import { useAuth } from "@/providers/AuthProvider";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [topic, setTopic] = useState(TOPICS[0].value);
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("EASY");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    // Anyone can see the topic/difficulty picker and try it out — the past
    // interview list is the only part that actually needs an account, so
    // guests just skip this fetch instead of hitting a guaranteed 401.
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    listInterviewSessions()
      .then(setSessions)
      .catch((error) => setListError(getErrorMessage(error, "Could not load your past interviews.")))
      .finally(() => setIsLoading(false));
  }, [user, isAuthLoading]);

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setStartError("Sign in to start a mock interview — it only takes a second.");
      return;
    }
    setIsStarting(true);
    setStartError(null);
    try {
      const session = await startInterviewSession({ topic, difficulty });
      router.push(`/interview/${session.id}`);
    } catch (error) {
      setStartError(getErrorMessage(error, "Could not start the interview. Try again."));
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
          <button type="submit" className="button button-small" disabled={isStarting}>
            {isStarting ? "Starting…" : "Start interview"} <span aria-hidden="true">→</span>
          </button>
        </form>
        {startError && (
          <div className={styles.guestPrompt}>
            <p className={styles.formError}>{startError}</p>
            {!user && (
              <Link className="button button-small" href={`/signin?next=${encodeURIComponent("/interview")}`}>
                Sign in <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}
      </section>

      <h2 className={styles.sectionTitle}>Past interviews</h2>
      {!user ? (
        <div className={styles.emptyPanel}>
          <p>Sign in to save every mock interview and pick up your feedback later.</p>
          <Link className="button button-small" href={`/signin?next=${encodeURIComponent("/interview")}`}>
            Sign in <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : isLoading ? (
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
    <>
      <SiteHeader />
      <InterviewContent />
      <SiteFooter />
    </>
  );
}
