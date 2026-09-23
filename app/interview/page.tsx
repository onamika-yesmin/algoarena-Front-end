"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../_components/home/SiteHeader";
import { SiteFooter } from "../_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
  { value: "dynamic-programming", label: "Dynamic programming" },
  { value: "graphs", label: "Graphs" },
  { value: "general", label: "General" },
];

/* Validated status steps — see the note at the top of interview.module.css.
   Every control that uses one also carries its text label. */
const DIFFICULTIES: { value: InterviewDifficulty; label: string; color: string }[] = [
  { value: "EASY", label: "Easy", color: "#65dfad" },
  { value: "MEDIUM", label: "Medium", color: "#ffc861" },
  { value: "HARD", label: "Hard", color: "#f2545b" },
];

// Kept in sync with the backend's MIN/MAX_TOTAL_QUESTIONS clamp in
// interview.service.ts — offering only values the server will actually
// honor as-is, rather than letting a pick get silently clamped.
const QUESTION_COUNTS = [3, 5, 7, 10];
const DEFAULT_QUESTION_COUNT = 5;
/** Rough pacing used only for the "about N minutes" hint on the form. */
const MINUTES_PER_QUESTION = 2;

type SessionFilter = "ALL" | "in_progress" | "completed";

function difficultyMeta(value: InterviewDifficulty) {
  return DIFFICULTIES.find((item) => item.value === value) ?? DIFFICULTIES[0];
}

function ScoreDial({ score }: { score: number }) {
  const ratio = Math.max(0, Math.min(1, score / 10));
  const hue = score >= 7 ? "#65dfad" : score >= 4 ? "#ffc861" : "#f2545b";
  return (
    <span
      className={styles.scoreDial}
      style={{ background: `conic-gradient(${hue} ${ratio * 360}deg, #232a48 0deg)` }}
      aria-hidden="true"
    >
      <span className={styles.scoreDialValue}>
        {score}
        <small>/10</small>
      </span>
    </span>
  );
}

function SessionCard({ session }: { session: InterviewSessionSummary }) {
  const meta = difficultyMeta(session.difficulty);
  const isDone = session.status === "completed";
  // Two messages per turn (the question, then the answer), so the number of
  // answered questions is half the transcript, capped at the session length.
  const total = session.totalQuestions ?? 5;
  const answered = Math.min(total, Math.floor(session.messageCount / 2));

  return (
    <Link href={`/interview/${session.id}`} className={styles.sessionCard}>
      <div>
        <div className={styles.sessionTop}>
          <span className={styles.sessionTopic}>{session.topic.replace(/-/g, " ")}</span>
          <span className={`${styles.badge} ${isDone ? styles.badgeCompleted : styles.badgeInProgress}`}>
            {isDone ? "Completed" : "In progress"}
          </span>
          <span className={styles.difficultyTag}>
            <span className={styles.chipDot} style={{ background: meta.color }} aria-hidden="true" />
            {meta.label}
          </span>
        </div>

        {session.reportSummary && <p className={styles.sessionSummary}>{session.reportSummary}</p>}

        {!isDone && (
          <span className={styles.sessionProgress} aria-hidden="true">
            <i style={{ width: `${(answered / total) * 100}%` }} />
          </span>
        )}

        <div className={styles.sessionMeta}>
          <span>
            {isDone ? `${total} questions` : `${answered} of ${total} answered`}
          </span>
          <span>{new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {typeof session.score === "number" ? (
        <ScoreDial score={session.score} />
      ) : (
        <span className={styles.resumeTag}>Resume →</span>
      )}
    </Link>
  );
}

function InterviewContent() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SessionFilter>("ALL");

  const [topic, setTopic] = useState(TOPICS[0].value);
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("EASY");
  const [totalQuestions, setTotalQuestions] = useState(DEFAULT_QUESTION_COUNT);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listInterviewSessions()
      .then((result) => {
        if (!cancelled) setSessions(result);
      })
      .catch((error) => {
        if (!cancelled) setListError(getErrorMessage(error, "Could not load your past interviews."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsStarting(true);
    setStartError(null);
    try {
      const session = await startInterviewSession({ topic, difficulty, totalQuestions });
      router.push(`/interview/${session.id}`);
    } catch (error) {
      setStartError(getErrorMessage(error, "Could not start the interview. Try again."));
      setIsStarting(false);
    }
  };

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    const scored = completed.filter((s) => typeof s.score === "number").map((s) => s.score as number);
    const average = scored.length > 0 ? scored.reduce((sum, value) => sum + value, 0) / scored.length : null;
    return {
      total: sessions.length,
      completed: completed.length,
      average: average === null ? "—" : `${average.toFixed(1)}/10`,
      best: scored.length > 0 ? `${Math.max(...scored)}/10` : "—",
    };
  }, [sessions]);

  const counts = {
    ALL: sessions.length,
    in_progress: sessions.filter((s) => s.status === "in_progress").length,
    completed: sessions.filter((s) => s.status === "completed").length,
  };
  const visible = filter === "ALL" ? sessions : sessions.filter((s) => s.status === filter);

  const topicLabel = TOPICS.find((item) => item.value === topic)?.label ?? topic;
  const minutes = totalQuestions * MINUTES_PER_QUESTION;

  return (
    <main className={`section-shell ${styles.page}`}>
      <div className={styles.head}>
        <p className="eyebrow">
          <b />
          MOCK INTERVIEW
        </p>
        <h1>Practise saying it out loud.</h1>
        <p className={styles.lede}>
          Talk through a problem the way you would with a real interviewer. The AI asks the questions, follows up on
          what you actually say, and scores you with written feedback at the end.
        </p>
      </div>

      <section className={styles.setup}>
        <span className={styles.setupGlow} aria-hidden="true" />
        <h2 className={styles.setupTitle}>Set up your interview</h2>
        <p className={styles.setupSubtitle}>Three choices, then you&apos;re straight into the conversation.</p>

        <form onSubmit={handleStart}>
          <div className={styles.field}>
            <span className={styles.fieldLabel} id="topic-label">
              Topic
            </span>
            <div className={styles.chips} role="group" aria-labelledby="topic-label">
              {TOPICS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={isStarting}
                  aria-pressed={topic === item.value}
                  className={`${styles.chip}${topic === item.value ? ` ${styles.chipActive}` : ""}`}
                  onClick={() => setTopic(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id="difficulty-label">
              Difficulty
            </span>
            <div className={styles.chips} role="group" aria-labelledby="difficulty-label">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={isStarting}
                  aria-pressed={difficulty === item.value}
                  className={`${styles.chip}${difficulty === item.value ? ` ${styles.chipActive}` : ""}`}
                  onClick={() => setDifficulty(item.value)}
                >
                  <span className={styles.chipDot} style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id="length-label">
              Length
            </span>
            <div className={styles.chips} role="group" aria-labelledby="length-label">
              {QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isStarting}
                  aria-pressed={totalQuestions === count}
                  className={`${styles.chip}${totalQuestions === count ? ` ${styles.chipActive}` : ""}`}
                  onClick={() => setTotalQuestions(count)}
                >
                  {count} questions
                </button>
              ))}
            </div>
          </div>

          <div className={styles.summary}>
            <p className={styles.summaryText}>
              A <b>{totalQuestions}-question</b> <b>{difficultyMeta(difficulty).label.toLowerCase()}</b> interview on{" "}
              <b>{topicLabel.toLowerCase()}</b> — about <b>{minutes} minutes</b>.
            </p>
            <div className={styles.summaryAction}>
              <button type="submit" className="button" disabled={isStarting}>
                {isStarting ? "Starting…" : "Start interview"} <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </form>

        {startError && <p className={styles.formError}>{startError}</p>}
      </section>

      {sessions.length > 0 && (
        <section className={styles.stats}>
          <div className={styles.stat}>
            <b>{stats.total}</b>
            <span>Interviews</span>
          </div>
          <div className={styles.stat}>
            <b>{stats.completed}</b>
            <span>Completed</span>
          </div>
          <div className={styles.stat}>
            <b>{stats.average}</b>
            <span>Average score</span>
          </div>
          <div className={styles.stat}>
            <b>{stats.best}</b>
            <span>Best score</span>
          </div>
        </section>
      )}

      <div className={styles.listHead}>
        <h2 className={styles.sectionTitle}>Past interviews</h2>
        {sessions.length > 0 && (
          <div className={styles.filters} role="group" aria-label="Filter interviews">
            {([
              { key: "ALL", label: "All" },
              { key: "in_progress", label: "In progress" },
              { key: "completed", label: "Completed" },
            ] as { key: SessionFilter; label: string }[]).map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                className={`${styles.filterButton}${filter === item.key ? ` ${styles.filterActive}` : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                <span className={styles.filterCount}>{counts[item.key]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <Loader label="Loading your interviews…" />
      ) : listError ? (
        <p className={styles.formError}>{listError}</p>
      ) : sessions.length === 0 ? (
        <div className={styles.empty}>
          <b>No interviews yet</b>
          Pick a topic above and run your first one — it takes about ten minutes and you get a written score at the end.
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <b>Nothing here yet</b>
          No interviews match that filter.
        </div>
      ) : (
        <div className={styles.sessionList}>
          {visible.map((session) => (
            <SessionCard key={session.id} session={session} />
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
