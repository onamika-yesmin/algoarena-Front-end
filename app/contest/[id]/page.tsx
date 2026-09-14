"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getContestByIdentifier, getContestScoreboard, registerForContest } from "@/lib/api/contests";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import type { ContestDetail, ContestScoreboardEntry, ContestStatus } from "@/types/api";
import { PageLoader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const statusLabel: Record<string, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Live now",
  ENDED: "Ended",
};

// How often the displayed status is re-derived from the clock, and how often
// a live contest's scoreboard is re-fetched.
const STATUS_TICK_MS = 15_000;
const SCOREBOARD_POLL_MS = 30_000;

// Mirrors the backend's getContestStatus() (contest.service.ts), so the page
// moves from Upcoming → Live → Ended on its own instead of staying frozen on
// whatever status it happened to load with.
const deriveStatus = (contest: ContestDetail, now: number): ContestStatus => {
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return contest.status;
  if (now < start) return "UPCOMING";
  if (now > end) return "ENDED";
  return "ONGOING";
};

export default function ContestDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [scoreboard, setScoreboard] = useState<ContestScoreboardEntry[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = () => {
    setStatus("loading");
    getContestByIdentifier(params.id)
      .then((data) => {
        setContest(data);
        setStatus("ready");
      })
      .catch((error) => {
        setLoadErrorMessage(getErrorMessage(error, "Could not load this contest. It may not exist."));
        setStatus("error");
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STATUS_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const contestStatus = contest ? deriveStatus(contest, now) : null;

  // Loads the scoreboard once the contest's status is known, again whenever
  // that status changes (so the final standings show up once it ends), and
  // every SCOREBOARD_POLL_MS while it's live.
  useEffect(() => {
    if (!contestStatus) return;
    let cancelled = false;
    const fetchScoreboard = () => {
      getContestScoreboard(params.id)
        .then((result) => {
          if (!cancelled) setScoreboard(result.entries);
        })
        .catch(() => {
          // Keep whatever scoreboard is already showing.
        });
    };
    fetchScoreboard();
    const interval = contestStatus === "ONGOING" ? setInterval(fetchScoreboard, SCOREBOARD_POLL_MS) : undefined;
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [params.id, contestStatus]);

  const register = async () => {
    if (!user) {
      setRegisterError("Sign in to register for this contest.");
      return;
    }
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await registerForContest(params.id);
      load();
    } catch (error) {
      setRegisterError(error instanceof ApiError ? error.message : "Registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (status === "loading") {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <PageLoader label="Loading contest…" />
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  if (status === "error" || !contest) {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <main className="section-shell workspace">
          <p className="problem-list-status">{loadErrorMessage}</p>
          <Link className="text-link" href="/contest">
            ← Back to contests
          </Link>
        </main>
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  const liveStatus = contestStatus ?? contest.status;

  // Problems open in contest mode (?contestId=…, which scores submissions
  // for this contest) only while it's live and the user is registered.
  // Before it starts the titles are listed without links (no spoilers);
  // otherwise they're plain practice links.
  const problemHref = (slug: string) => {
    if (liveStatus === "UPCOMING") return null;
    return liveStatus === "ONGOING" && contest.isRegistered ? `/problems/${slug}?contestId=${contest.id}` : `/problems/${slug}`;
  };

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        {statusLabel[liveStatus] ?? liveStatus}
      </p>
      <h1>{contest.title}</h1>
      <p>{contest.description}</p>
      <div className="problem-meta">
        <span>Starts: {new Date(contest.startTime).toLocaleString()}</span>
        <span>Ends: {new Date(contest.endTime).toLocaleString()}</span>
      </div>

      {liveStatus !== "ENDED" && (
        <div style={{ marginTop: 18 }}>
          {contest.isRegistered ? (
            <p className="problem-list-status">You&apos;re registered for this contest.</p>
          ) : (
            <button type="button" className="button button-small" onClick={register} disabled={isRegistering}>
              {isRegistering ? "Registering…" : "Register"}
            </button>
          )}
          {registerError && <p className="verdict-failed">{registerError}</p>}
        </div>
      )}

      <div className="problem-workspace-grid" style={{ marginTop: 28 }}>
        <section className="problem-statement">
          <h2>Problems</h2>
          {contest.problems.length === 0 && <p>No problems have been added to this contest yet.</p>}
          {liveStatus === "UPCOMING" && contest.problems.length > 0 && <p>Problems open once the contest starts.</p>}
          {contest.problems.map((entry) => {
            if (!entry.slug) return <p key={entry.problemId}>{entry.title} (unavailable)</p>;
            const href = problemHref(entry.slug);
            const card = (
              <>
                <div className="problem-card-top">
                  <span className={`pill pill-${(entry.difficulty ?? "easy").toLowerCase()}`}>{entry.difficulty}</span>
                </div>
                <h3>{entry.title}</h3>
                <div className="problem-card-foot">
                  <span>{entry.points} pts</span>
                  {href && <span aria-hidden="true">→</span>}
                </div>
              </>
            );
            return href ? (
              <Link key={entry.problemId} href={href} className="problem-card" style={{ marginBottom: 12 }}>
                {card}
              </Link>
            ) : (
              <div key={entry.problemId} className="problem-card" style={{ marginBottom: 12 }}>
                {card}
              </div>
            );
          })}
        </section>

        <section>
          <h2>Scoreboard</h2>
          {scoreboard.length === 0 ? (
            <p className="problem-list-status">No scores yet — be the first to submit.</p>
          ) : (
            <div className="submission-history">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Solver</th>
                    <th>Solved</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((entry) => (
                    <tr key={entry.userId}>
                      <td>#{entry.rank}</td>
                      <td>{entry.name}</td>
                      <td>{entry.problemsSolved}</td>
                      <td>{entry.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Link className="text-link" href="/contest" style={{ marginTop: 24, display: "inline-flex" }}>
        ← All contests
      </Link>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
