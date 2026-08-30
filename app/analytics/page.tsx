"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../_components/home/SiteHeader";
import { SiteFooter } from "../_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader } from "@/components/ui/Loader";
import { getMyAnalytics, getMyAnalyticsHistory } from "@/lib/api/analytics";
import type { AnalyticsResult, AnalyticsHistoryEntry } from "@/lib/api/analytics";
import { getErrorMessage } from "@/lib/api/client";
import styles from "./analytics.module.css";

const VERDICT_LABELS: Record<string, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong answer",
  TIME_LIMIT_EXCEEDED: "Time limit exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded",
  RUNTIME_ERROR: "Runtime error",
  COMPILATION_ERROR: "Compilation error",
  PENDING: "Pending",
  RUNNING: "Running",
};

const VERDICT_FILL_CLASS: Record<string, string> = {
  ACCEPTED: styles.fillAccepted,
  WRONG_ANSWER: styles.fillWrong,
  PENDING: styles.fillPending,
  RUNNING: styles.fillRunning,
  TIME_LIMIT_EXCEEDED: styles.fillError,
  MEMORY_LIMIT_EXCEEDED: styles.fillError,
  RUNTIME_ERROR: styles.fillError,
  COMPILATION_ERROR: styles.fillError,
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  cpp: "C++",
  javascript: "JavaScript",
};

const DIFFICULTY_FILL_CLASS: Record<string, string> = {
  EASY: styles.fillEasy,
  MEDIUM: styles.fillMedium,
  HARD: styles.fillHard,
};

function BarList({
  rows,
  labelFor,
  fillClassFor,
}: {
  rows: { key: string; count: number }[];
  labelFor: (key: string) => string;
  fillClassFor?: (key: string) => string | undefined;
}) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0) || 1;
  return (
    <div className={styles.barList}>
      {rows.map((row) => (
        <div className={styles.barRow} key={row.key}>
          <span className={styles.barLabel}>{labelFor(row.key)}</span>
          <span className={styles.barTrack}>
            <span
              className={`${styles.barFill} ${fillClassFor?.(row.key) ?? ""}`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </span>
          <span className={styles.barCount}>{row.count}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityStrip({ activity }: { activity: AnalyticsResult["activity"] }) {
  const max = activity.reduce((acc, day) => Math.max(acc, day.count), 0) || 1;
  return (
    <>
      <div className={styles.activityStrip}>
        {activity.map((day) => {
          const ratio = day.count > 0 ? Math.max(day.count / max, 0.12) : 0;
          return (
            <span
              key={day.date}
              className={styles.activityCell}
              title={`${day.date}: ${day.count} submission${day.count === 1 ? "" : "s"}`}
            >
              <span
                className={styles.activityFill}
                style={{ height: `${ratio * 100}%`, opacity: day.count > 0 ? 1 : 0 }}
              />
            </span>
          );
        })}
      </div>
      <div className={styles.activityLegend}>
        <span>{activity[0]?.date}</span>
        <span>{activity[activity.length - 1]?.date}</span>
      </div>
    </>
  );
}

function ProgressHistory({ history }: { history: AnalyticsHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <p className={styles.emptyState}>
        Come back tomorrow to start seeing your progress charted day by day.
      </p>
    );
  }

  return (
    <div className={styles.historyList}>
      {[...history].reverse().map((day) => (
        <div className={styles.historyRow} key={day.date}>
          <span className={styles.historyDate}>{new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <span className={styles.historyMetric}>
            <b>{day.problemsSolved}</b> solved
          </span>
          <span className={styles.historyMetric}>
            <b>{day.accuracyPercent}%</b> accuracy
          </span>
          <span className={styles.historyMetric}>
            <b>{day.currentStreakDays}</b> day streak
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsContent() {
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<AnalyticsHistoryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getMyAnalytics()
      .then((result) => {
        if (cancelled) return;
        setAnalytics(result);
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load your analytics. Please try again later."));
          setStatus("error");
        }
      });
    // A snapshot is only written once getMyAnalytics() above has run at
    // least once (it's the one that upserts "today"), but fetching history
    // in parallel is safe either way — today's row just won't exist yet on
    // someone's very first-ever analytics load this session.
    getMyAnalyticsHistory(30)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch(() => {
        // Non-critical — the live numbers above are already shown either way.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">
            <b />
            YOUR ARENA / ANALYTICS
          </p>
          <h1>Your analytics</h1>
          <p>A breakdown of every submission you&apos;ve made — verdicts, languages, difficulty and your solving streak.</p>
        </div>
        <Link className="button button-small" href="/problems">
          Solve a problem <span>→</span>
        </Link>
      </div>

      {status === "loading" && <Loader label="Loading your analytics…" />}
      {status === "error" && <p className="problem-list-status">{errorMessage}</p>}

      {status === "ready" && analytics && (
        <>
          <section className="metric-grid">
            <article>
              <b>{analytics.problemsSolved}</b>
              <span>Problems solved</span>
            </article>
            <article>
              <b>{analytics.accuracyPercent}%</b>
              <span>Accuracy</span>
            </article>
            <article>
              <b>{analytics.currentStreakDays}</b>
              <span>Current streak (days)</span>
            </article>
            <article>
              <b>{analytics.totalSubmissions}</b>
              <span>Total submissions</span>
            </article>
          </section>

          {analytics.totalSubmissions === 0 ? (
            <section className={styles.panel}>
              <p className={styles.emptyState}>
                You haven&apos;t submitted anything yet. <Link href="/problems">Solve your first problem</Link> to see analytics here.
              </p>
            </section>
          ) : (
            <>
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Verdict breakdown</h2>
                <p className={styles.panelSubtitle}>How your submissions resolved across every attempt.</p>
                <BarList
                  rows={analytics.verdictBreakdown.map((entry) => ({ key: entry.verdict, count: entry.count }))}
                  labelFor={(key) => VERDICT_LABELS[key] ?? key}
                  fillClassFor={(key) => VERDICT_FILL_CLASS[key]}
                />
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Language breakdown</h2>
                <p className={styles.panelSubtitle}>Which languages you submit in most often.</p>
                <BarList
                  rows={analytics.languageBreakdown.map((entry) => ({ key: entry.language, count: entry.count }))}
                  labelFor={(key) => LANGUAGE_LABELS[key] ?? key}
                />
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Difficulty breakdown</h2>
                <p className={styles.panelSubtitle}>Distinct problems solved, by difficulty.</p>
                {analytics.difficultyBreakdown.length === 0 ? (
                  <p className={styles.emptyState}>
                    No solved problems yet. <Link href="/problems">Browse the problem library</Link> to get started.
                  </p>
                ) : (
                  <>
                    <div className={styles.legendRow}>
                      <span className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: "#55d8d2" }} /> Easy
                      </span>
                      <span className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: "#ffb254" }} /> Medium
                      </span>
                      <span className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: "#fc6c70" }} /> Hard
                      </span>
                    </div>
                    <BarList
                      rows={analytics.difficultyBreakdown.map((entry) => ({ key: entry.difficulty, count: entry.count }))}
                      labelFor={(key) => key.charAt(0) + key.slice(1).toLowerCase()}
                      fillClassFor={(key) => DIFFICULTY_FILL_CLASS[key]}
                    />
                  </>
                )}
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Last 30 days</h2>
                <p className={styles.panelSubtitle}>Daily submission activity, oldest to newest.</p>
                <ActivityStrip activity={analytics.activity} />
              </section>
            </>
          )}

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Progress history</h2>
            <p className={styles.panelSubtitle}>A daily snapshot of your standing, newest first — builds up day by day as you keep solving.</p>
            <ProgressHistory history={history} />
          </section>
        </>
      )}
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <AnalyticsContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
