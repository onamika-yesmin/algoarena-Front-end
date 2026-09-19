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
import {
  ActivityCalendar,
  BarBreakdown,
  StatTile,
  STATUS,
  TrendChart,
  TrendSwitch,
  formatDay,
  type BarRow,
  type TrendMetric,
} from "./charts";
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

/* A verdict is a state, not an identity, so it takes the reserved status
   scale — and every bar is labelled, so the colour only reinforces. */
const VERDICT_COLOR: Record<string, string> = {
  ACCEPTED: STATUS.good,
  PENDING: STATUS.info,
  RUNNING: STATUS.info,
  WRONG_ANSWER: STATUS.bad,
  TIME_LIMIT_EXCEEDED: STATUS.warn,
  MEMORY_LIMIT_EXCEEDED: STATUS.warn,
  RUNTIME_ERROR: STATUS.bad,
  COMPILATION_ERROR: STATUS.bad,
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  cpp: "C++",
  javascript: "JavaScript",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: STATUS.good,
  MEDIUM: STATUS.warn,
  HARD: STATUS.bad,
};

const DIFFICULTY_ORDER = ["EASY", "MEDIUM", "HARD"];

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          {subtitle && <p className={styles.panelSubtitle}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Wording for a stat tile's change over the loaded history window. */
function deltaFor(history: AnalyticsHistoryEntry[], key: "problemsSolved" | "accuracyPercent" | "totalSubmissions", suffix = "") {
  if (history.length < 2) return undefined;
  const change = history[history.length - 1][key] - history[0][key];
  const since = formatDay(history[0].date);
  if (change === 0) return { text: `No change since ${since}`, direction: "flat" as const };
  return {
    text: `${change > 0 ? "+" : ""}${change}${suffix} since ${since}`,
    direction: change > 0 ? ("up" as const) : ("flat" as const),
  };
}

function AnalyticsContent() {
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<AnalyticsHistoryEntry[]>([]);
  const [metric, setMetric] = useState<TrendMetric>("problemsSolved");

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

  const verdictRows: BarRow[] =
    analytics?.verdictBreakdown.map((entry) => ({
      key: entry.verdict,
      label: VERDICT_LABELS[entry.verdict] ?? entry.verdict,
      count: entry.count,
      color: VERDICT_COLOR[entry.verdict] ?? STATUS.info,
    })) ?? [];

  // Nominal categories — one series, so every bar shares the series hue.
  const languageRows: BarRow[] =
    analytics?.languageBreakdown.map((entry) => ({
      key: entry.language,
      label: LANGUAGE_LABELS[entry.language] ?? entry.language,
      count: entry.count,
    })) ?? [];

  const difficultyRows: BarRow[] = (analytics?.difficultyBreakdown ?? [])
    .slice()
    .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty))
    .map((entry) => ({
      key: entry.difficulty,
      label: entry.difficulty.charAt(0) + entry.difficulty.slice(1).toLowerCase(),
      count: entry.count,
      color: DIFFICULTY_COLOR[entry.difficulty],
    }));

  return (
    <main className={`section-shell ${styles.page}`}>
      <div className={styles.head}>
        <div>
          <p className="eyebrow">
            <b />
            YOUR ARENA / ANALYTICS
          </p>
          <h1>Your analytics</h1>
          <p className={styles.lede}>
            Every submission you&apos;ve made, broken down — verdicts, languages, difficulty, and how your standing has
            moved day by day.
          </p>
        </div>
        <Link className="button button-small" href="/problems">
          Solve a problem <span>→</span>
        </Link>
      </div>

      {status === "loading" && <Loader label="Loading your analytics…" />}
      {status === "error" && <p className={styles.emptyState}>{errorMessage}</p>}

      {status === "ready" && analytics && (
        <>
          <section className={styles.tiles}>
            <StatTile
              label="Problems solved"
              value={String(analytics.problemsSolved)}
              delta={deltaFor(history, "problemsSolved")}
              trend={history.map((day) => day.problemsSolved)}
            />
            <StatTile
              label="Accuracy"
              value={`${analytics.accuracyPercent}%`}
              delta={deltaFor(history, "accuracyPercent", "%")}
              trend={history.map((day) => day.accuracyPercent)}
            />
            <StatTile
              label="Current streak"
              value={`${analytics.currentStreakDays} ${analytics.currentStreakDays === 1 ? "day" : "days"}`}
              trend={history.map((day) => day.currentStreakDays)}
            />
            <StatTile
              label="Total submissions"
              value={String(analytics.totalSubmissions)}
              delta={deltaFor(history, "totalSubmissions")}
              trend={history.map((day) => day.totalSubmissions)}
            />
          </section>

          {analytics.totalSubmissions === 0 ? (
            <Panel title="Nothing to chart yet">
              <p className={styles.emptyState}>
                You haven&apos;t submitted anything yet. <Link href="/problems">Solve your first problem</Link> and this
                page fills in.
              </p>
            </Panel>
          ) : (
            <>
              <Panel
                title="Progress over time"
                subtitle="One daily snapshot per day you visit. Hover a point for that day's figures."
                action={<TrendSwitch metric={metric} onChange={setMetric} />}
              >
                <TrendChart history={history} metric={metric} />
              </Panel>

              <Panel title="Last 30 days" subtitle="Daily submission activity — darker means a busier day.">
                <ActivityCalendar activity={analytics.activity} />
              </Panel>

              <div className={styles.panelRow}>
                <Panel title="Verdicts" subtitle="How every attempt resolved.">
                  <BarBreakdown rows={verdictRows} totalForPercent={analytics.totalSubmissions} />
                </Panel>

                <Panel title="Languages" subtitle="What you submit in most often.">
                  <BarBreakdown rows={languageRows} />
                </Panel>

                <Panel title="Difficulty" subtitle="Distinct problems solved.">
                  {difficultyRows.length === 0 ? (
                    <p className={styles.emptyState}>
                      No solved problems yet. <Link href="/problems">Browse the library</Link> to get started.
                    </p>
                  ) : (
                    <BarBreakdown rows={difficultyRows} />
                  )}
                </Panel>
              </div>
            </>
          )}

          <Panel
            title="Daily snapshots"
            subtitle="The same history as the chart above, newest first — and the full numbers behind it."
          >
            {history.length === 0 ? (
              <p className={styles.emptyState}>Come back tomorrow to start seeing your progress day by day.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Solved</th>
                      <th scope="col">Accuracy</th>
                      <th scope="col">Streak</th>
                      <th scope="col">Submissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((day) => (
                      <tr key={day.date}>
                        <td>{formatDay(day.date)}</td>
                        <td>{day.problemsSolved}</td>
                        <td>{day.accuracyPercent}%</td>
                        <td>
                          {day.currentStreakDays} {day.currentStreakDays === 1 ? "day" : "days"}
                        </td>
                        <td>{day.totalSubmissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
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
