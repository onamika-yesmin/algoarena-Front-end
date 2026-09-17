"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { deriveContestStatus, getContestByIdentifier, getContestScoreboard, registerForContest } from "@/lib/api/contests";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import type { ContestDetail, ContestScoreboardEntry, ContestStatus } from "@/types/api";
import { PageLoader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getSocket } from "@/lib/socket";
import styles from "../contest.module.css";
import layout from "./contestDetail.module.css";

const statusLabel: Record<ContestStatus, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Live now",
  ENDED: "Ended",
};

// How often the displayed status is re-derived from the clock, and how often
// a live contest's scoreboard is re-fetched.
const STATUS_TICK_MS = 15_000;
const SCOREBOARD_POLL_MS = 30_000;

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

// Coarse countdown for the status card: "2d 4h", "3h 20m", "45m".
const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${rest}m`;
  return `${rest}m`;
};

const problemLabel = (index: number) => String.fromCharCode(65 + (index % 26));

const rankClass = (rank: number) => (rank === 1 ? layout.rank1 : rank === 2 ? layout.rank2 : rank === 3 ? layout.rank3 : "");

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

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

  // `silent` refreshes the contest in place (e.g. right after registering)
  // instead of swapping the whole page for the loader.
  const load = (silent = false) => {
    if (!silent) setStatus("loading");
    return getContestByIdentifier(params.id)
      .then((data) => {
        setContest(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (silent) {
          setRegisterError(getErrorMessage(error, "Couldn't refresh the contest — please reload the page."));
          return;
        }
        setLoadErrorMessage(getErrorMessage(error, "Could not load this contest. It may not exist."));
        setStatus("error");
      });
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STATUS_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Mirrors the backend's getContestStatus() (see deriveContestStatus), so the
  // page moves from Upcoming → Live → Ended on its own.
  const contestStatus = contest ? deriveContestStatus(contest, now) : null;

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

  // Connect to Socket.IO and listen for real-time contest scoreboard broadcasts
  useEffect(() => {
    if (!contest?.id) return;

    const socket = getSocket();
    const contestId = contest.id;

    socket.emit("join:contest", { contestId });

    socket.on("contest:scoreboard", (result: { entries: ContestScoreboardEntry[] }) => {
      if (result?.entries) {
        setScoreboard(result.entries);
      }
    });

    return () => {
      socket.emit("leave:contest", { contestId });
      socket.off("contest:scoreboard");
    };
  }, [contest?.id]);

  const register = async () => {
    if (!user) {
      setRegisterError("Sign in to register for this contest.");
      return;
    }
    if (isRegistering) return;
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await registerForContest(params.id);
      await load(true);
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
        <main className={`section-shell ${layout.page}`}>
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
  // While the contest is live, only registered participants can open its
  // problems — the server rejects an unregistered contest submission anyway.
  const problemsLocked = liveStatus === "ONGOING" && !contest.isRegistered;

  // Problems open in contest mode (?contestId=…, which scores submissions
  // for this contest) only while it's live and the user is registered; live
  // but unregistered they stay locked. Before it starts the titles are listed
  // without links (no spoilers); once it has ended they're plain practice links.
  const problemHref = (slug: string) => {
    if (liveStatus === "UPCOMING" || problemsLocked) return null;
    return liveStatus === "ONGOING" ? `/problems/${slug}?contestId=${contest.id}` : `/problems/${slug}`;
  };

  const startsAt = new Date(contest.startTime).getTime();
  const endsAt = new Date(contest.endTime).getTime();
  const timing =
    liveStatus === "UPCOMING" ? `Starts in ${formatDuration(startsAt - now)}` : liveStatus === "ONGOING" ? `Ends in ${formatDuration(endsAt - now)}` : "Finished";
  const totalPoints = contest.problems.reduce((sum, entry) => sum + entry.points, 0);
  const currentUserId = user?.id ?? user?._id;
  const emptyScoreboardText =
    liveStatus === "UPCOMING"
      ? "Scores appear here once the contest starts."
      : liveStatus === "ONGOING"
        ? "No scores yet — be the first to solve a problem."
        : "Nobody scored in this contest.";

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className={`section-shell ${layout.page}`}>
        <Link className={`text-link ${layout.back}`} href="/contest">
          <span aria-hidden="true">←</span> All contests
        </Link>

        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className="eyebrow">
              <b />
              {statusLabel[liveStatus]}
            </p>
            <h1 className={layout.title}>{contest.title}</h1>
            {contest.description && <p className={layout.description}>{contest.description}</p>}
          </div>
          <dl className={layout.facts}>
            <div className={layout.fact}>
              <dt>Status</dt>
              <dd>
                <span className={`pill pill-contest-${liveStatus.toLowerCase()}`}>{statusLabel[liveStatus]}</span>
                <span className={layout.timing}>{timing}</span>
              </dd>
            </div>
            <div className={layout.fact}>
              <dt>Problems</dt>
              <dd>
                {contest.problems.length} · {totalPoints} pts
              </dd>
            </div>
            <div className={layout.fact}>
              <dt>Starts</dt>
              <dd>{formatDateTime(contest.startTime)}</dd>
            </div>
            <div className={layout.fact}>
              <dt>Ends</dt>
              <dd>{formatDateTime(contest.endTime)}</dd>
            </div>
          </dl>
        </header>

        {liveStatus !== "ENDED" &&
          (contest.isRegistered ? (
            <div className={`${styles.registerBox} ${layout.registered}`}>
              <p className={styles.registerText}>
                <span className={layout.check} aria-hidden="true">
                  ✓
                </span>{" "}
                <b>You&apos;re registered.</b>{" "}
                {liveStatus === "UPCOMING"
                  ? "The problems unlock here when the contest starts."
                  : "Open a problem below — your submissions count toward the scoreboard."}
              </p>
            </div>
          ) : (
            <div className={`${styles.registerBox}${problemsLocked ? ` ${styles.registerBoxLocked}` : ""}`}>
              <button type="button" className="button button-small" onClick={register} disabled={isRegistering}>
                {isRegistering ? "Registering…" : "Register"}
              </button>
              <p className={styles.registerText}>
                {problemsLocked ? (
                  <>
                    <LockIcon /> <b>Register to unlock the problems.</b> Only registered participants can solve them and appear on the scoreboard.
                  </>
                ) : (
                  "Register now — the problems open to registered participants when the contest starts."
                )}
              </p>
              {registerError && (
                <p className={`verdict-failed ${styles.registerError}`} role="alert">
                  {registerError}
                </p>
              )}
            </div>
          ))}

        <div className={layout.grid}>
          <section className={layout.panel} aria-labelledby="contest-problems-heading">
            <div className={layout.panelHead}>
              <h2 id="contest-problems-heading">Problems</h2>
              <span className={layout.panelMeta}>
                {contest.problems.length} {contest.problems.length === 1 ? "problem" : "problems"}
              </span>
            </div>
            <div className={layout.panelBody}>
              {contest.problems.length === 0 && <p className={layout.empty}>No problems have been added to this contest yet.</p>}
              {liveStatus === "UPCOMING" && contest.problems.length > 0 && <p className={layout.note}>The problems open once the contest starts.</p>}
              {problemsLocked && contest.problems.length > 0 && (
                <p className={`${styles.lockedNote} ${layout.note}`}>
                  <LockIcon /> Locked — register above to unlock the problems.
                </p>
              )}
              {contest.problems.length > 0 && (
                <ol className={layout.problemList}>
                  {contest.problems.map((entry, index) => {
                    const href = entry.slug ? problemHref(entry.slug) : null;
                    const card = (
                      <>
                        <span className={layout.problemIndex}>{problemLabel(index)}</span>
                        <div className={layout.problemMain}>
                          <h3>{entry.slug ? entry.title : `${entry.title} (unavailable)`}</h3>
                          <div className={layout.problemTags}>
                            {entry.difficulty && <span className={`pill pill-${entry.difficulty.toLowerCase()}`}>{entry.difficulty}</span>}
                            <span className={layout.points}>{entry.points} pts</span>
                          </div>
                        </div>
                        <span className={layout.problemAction}>
                          {problemsLocked ? (
                            <>
                              <LockIcon /> Locked
                            </>
                          ) : href ? (
                            <>
                              {liveStatus === "ONGOING" ? "Solve" : "Practice"} <span aria-hidden="true">→</span>
                            </>
                          ) : liveStatus === "UPCOMING" ? (
                            "Opens at start"
                          ) : null}
                        </span>
                      </>
                    );
                    return (
                      <li key={entry.problemId}>
                        {href ? (
                          <Link href={href} className={`problem-card ${layout.problemCard}`}>
                            {card}
                          </Link>
                        ) : (
                          <div className={`problem-card ${layout.problemCard}${problemsLocked ? ` ${styles.lockedCard}` : ` ${layout.staticCard}`}`}>{card}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          <section className={layout.panel} aria-labelledby="contest-scoreboard-heading">
            <div className={layout.panelHead}>
              <h2 id="contest-scoreboard-heading">Scoreboard</h2>
              {liveStatus === "ONGOING" && (
                <span className={layout.liveTag}>
                  <span className={layout.liveDot} aria-hidden="true" />
                  Live
                </span>
              )}
            </div>
            <div className={layout.panelBody}>
              {scoreboard.length === 0 ? (
                <p className={layout.empty}>{emptyScoreboardText}</p>
              ) : (
                <div className={layout.tableWrap}>
                  <table className={layout.table}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Solver</th>
                        <th className={layout.num}>Solved</th>
                        <th className={layout.num}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreboard.map((entry) => {
                        const isMe = Boolean(currentUserId) && entry.userId === currentUserId;
                        return (
                          <tr key={entry.userId} className={isMe ? layout.me : undefined}>
                            <td>
                              <span className={`${layout.rank} ${rankClass(entry.rank)}`}>{entry.rank}</span>
                            </td>
                            <td className={layout.solver}>
                              {entry.name}
                              {isMe && <span className={layout.meTag}>you</span>}
                            </td>
                            <td className={layout.num}>{entry.problemsSolved}</td>
                            <td className={`${layout.num} ${layout.score}`}>{entry.totalScore}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
