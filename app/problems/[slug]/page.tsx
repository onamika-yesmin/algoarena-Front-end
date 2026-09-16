"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getProblemBySlug } from "@/lib/api/problems";
import { listSubmissions, runCode, submitSolution } from "@/lib/api/submissions";
import { deriveContestStatus, getContestByIdentifier, registerForContest } from "@/lib/api/contests";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { diagnoseCase, primaryCaseIndex, type RunLimits } from "@/lib/runDiagnostics";
import type { ContestDetail, Language, ProblemDetail, Submission } from "@/types/api";
import MonacoEditor, { type EditorMarker } from "@/components/editor/MonacoEditor";
import AIPanelTabs from "@/components/workspace/AIPanelTabs";
import RunResultPanel, { type RunState } from "@/components/workspace/RunResultPanel";
import { PageLoader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import gateStyles from "./contestGate.module.css";

const languages: Language[] = ["python", "cpp", "javascript", "typescript"];
const FILE_EXT: Record<Language, string> = { python: "py", cpp: "cpp", javascript: "js", typescript: "ts" };
const DEFAULT_LIMITS: RunLimits = { timeLimitMs: 2000, memoryLimitMb: 256 };

// ---- Contest mode (?contestId=…) -------------------------------------------
// How often the contest's status is re-derived from the clock.
const CONTEST_TICK_MS = 15_000;
const CONTEST_GATE_BANNER_ID = "contest-gate-banner";

type ContestLoad = { status: "idle" | "loading" | "ready" | "missing" | "error"; message?: string };

type ContestGate =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "missing" }
  | { kind: "not-in-contest"; contest: ContestDetail }
  | { kind: "upcoming"; contest: ContestDetail }
  | { kind: "unregistered"; contest: ContestDetail }
  | { kind: "active"; contest: ContestDetail }
  | { kind: "ended"; contest: ContestDetail };

/** Whether (and how) this problem can be solved for the contest in the URL. */
const getContestGate = (
  contestId: string | undefined,
  load: ContestLoad,
  contest: ContestDetail | null,
  problem: ProblemDetail | null,
  now: number,
): ContestGate => {
  if (!contestId) return { kind: "none" };
  if (load.status === "missing") return { kind: "missing" };
  if (load.status === "error") return { kind: "error", message: load.message ?? "Could not load the contest." };
  // Also "loading" for the one render where a previous contest is still in state.
  if (load.status !== "ready" || !contest || !problem || (contest.id !== contestId && contest.slug !== contestId)) return { kind: "loading" };
  const inContest = contest.problems.some((entry) => entry.problemId === problem.id || (entry.slug !== null && entry.slug === problem.slug));
  if (!inContest) return { kind: "not-in-contest", contest };
  const liveStatus = deriveContestStatus(contest, now);
  if (liveStatus === "UPCOMING") return { kind: "upcoming", contest };
  if (liveStatus === "ENDED") return { kind: "ended", contest };
  return contest.isRegistered ? { kind: "active", contest } : { kind: "unregistered", contest };
};

const formatContestTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

interface ContestGateBannerProps {
  gate: Exclude<ContestGate, { kind: "none" }>;
  practiceHref: string;
  isRegistering: boolean;
  registerError: string | null;
  onRegister: (contest: ContestDetail) => void;
  onRetry: () => void;
}

function ContestGateBanner({ gate, practiceHref, isRegistering, registerError, onRegister, onRetry }: ContestGateBannerProps) {
  const contestLink = (contest: ContestDetail, label: string) => (
    <Link className="text-link" href={`/contest/${contest.slug}`}>
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
  const registerButton = (contest: ContestDetail) => (
    <button type="button" className="button button-small" onClick={() => onRegister(contest)} disabled={isRegistering}>
      {isRegistering ? "Registering…" : "Register"}
    </button>
  );

  let tone = gateStyles.neutral;
  let title: React.ReactNode;
  let detail: React.ReactNode = null;
  let actions: React.ReactNode = null;
  let pulse = false;

  switch (gate.kind) {
    case "error":
      tone = gateStyles.error;
      title = "Couldn't check this contest";
      detail = `${gate.message} Run and Submit stay disabled until it loads — or practice this problem outside the contest.`;
      actions = (
        <>
          <button type="button" className="button-outline button-small" onClick={onRetry}>
            Retry
          </button>
          <Link className="text-link" href={practiceHref}>
            Practice instead <span aria-hidden="true">→</span>
          </Link>
        </>
      );
      break;
    case "missing":
      title = "Contest not found";
      detail = "This link points to a contest that doesn't exist. You're practicing — submissions won't count toward any contest.";
      actions = (
        <Link className="text-link" href="/contest">
          Browse contests <span aria-hidden="true">→</span>
        </Link>
      );
      break;
    case "not-in-contest":
      title = `This problem isn't part of ${gate.contest.title}`;
      detail = "You're practicing — submissions won't count for that contest.";
      actions = contestLink(gate.contest, "Back to the contest");
      break;
    case "upcoming":
      tone = gateStyles.upcoming;
      title = "This contest hasn't started yet";
      detail = `${gate.contest.title} starts ${formatContestTime(gate.contest.startTime)}. Run and Submit unlock when it begins${
        gate.contest.isRegistered ? "." : " — register now so you're ready."
      }`;
      actions = (
        <>
          {!gate.contest.isRegistered && registerButton(gate.contest)}
          {contestLink(gate.contest, "Contest page")}
        </>
      );
      break;
    case "unregistered":
      tone = gateStyles.locked;
      title = `Register for ${gate.contest.title} to solve this problem`;
      detail = "Run and Submit are disabled until you register — only registered participants can compete.";
      actions = (
        <>
          {registerButton(gate.contest)}
          {contestLink(gate.contest, "Contest page")}
        </>
      );
      break;
    case "active":
      tone = gateStyles.live;
      title = `Contest mode: ${gate.contest.title}`;
      detail = `Your submissions count toward the contest scoreboard. Ends ${formatContestTime(gate.contest.endTime)}.`;
      actions = contestLink(gate.contest, "Scoreboard");
      break;
    case "ended":
      title = "This contest has ended — you're practicing, submissions won't count for it";
      detail = `${gate.contest.title} finished ${formatContestTime(gate.contest.endTime)}.`;
      actions = contestLink(gate.contest, "Final standings");
      break;
    default:
      pulse = true;
      title = "Checking contest…";
      detail = "Run and Submit unlock once the contest status is confirmed.";
  }

  return (
    <div id={CONTEST_GATE_BANNER_ID} className={`${gateStyles.banner} ${tone}`} role="status" aria-live="polite">
      <div className={gateStyles.body}>
        <p className={gateStyles.title}>
          <span className={`${gateStyles.dot}${pulse || gate.kind === "active" ? ` ${gateStyles.pulse}` : ""}`} aria-hidden="true" />
          {title}
        </p>
        {detail && <p className={gateStyles.detail}>{detail}</p>}
      </div>
      {actions && <div className={gateStyles.actions}>{actions}</div>}
      {registerError && (gate.kind === "unregistered" || gate.kind === "upcoming") && (
        <p className={gateStyles.registerError} role="alert">
          {registerError}
        </p>
      )}
    </div>
  );
}

export default function ProblemDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user, refresh: refreshUser } = useAuth();
  // Set when this problem was opened from a contest (contest/[id]/page.tsx
  // links here with ?contestId=...) so a submission made from within a
  // contest actually counts toward that contest's scoreboard — previously
  // this was never read anywhere and no submission was ever tagged with a
  // contestId, so every contest scoreboard stayed empty forever. It's only
  // sent while the contest gate below is "active" (live + registered + this
  // problem is in the contest); otherwise the page runs in practice mode or
  // stays locked.
  const contestId = useSearchParams().get("contestId") || undefined;

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [language, setLanguage] = useState<Language>("python");
  const [codeByLanguage, setCodeByLanguage] = useState<Partial<Record<Language, string>>>({});
  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  // The language + exact code the last finished run used. The editor only
  // marks that run's error line while the code is unchanged, because any edit
  // can move the line the error pointed at.
  const [runSnapshot, setRunSnapshot] = useState<{ language: Language; code: string } | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [revealRequest, setRevealRequest] = useState<{ line: number; nonce: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);
  // Set only when this exact submission just paid out (first-ever ACCEPTED
  // on this problem) — briefly shown next to the verdict, and triggers a
  // header refresh so the new balance shows up right away.
  const [gemsEarned, setGemsEarned] = useState<number | null>(null);
  // The problem currently on screen. Next.js keeps this page mounted when
  // navigating between problems, so requests started for a previous problem
  // check this before writing state — otherwise a slow run, submission or
  // history response could show up on the next problem.
  const activeProblemIdRef = useRef<string | null>(null);

  // Contest gate state (only used with ?contestId=…). The contest is loaded
  // to check, with the same clock-based status as the contest page, that it's
  // live, that this user registered and that this problem belongs to it. The
  // server enforces the same rules on submit; this tells the solver up front.
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [contestLoad, setContestLoad] = useState<ContestLoad>(() => ({ status: contestId ? "loading" : "idle" }));
  const [contestNow, setContestNow] = useState(() => Date.now());
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const contestRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    activeProblemIdRef.current = null;
    setStatus("loading");
    setProblem(null);
    setSubmission(null);
    setSubmitError(null);
    setGemsEarned(null);
    setHistory([]);
    setRunState({ status: "idle" });
    setRunSnapshot(null);
    getProblemBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        activeProblemIdRef.current = data.id;
        setProblem(data);
        setCodeByLanguage({
          python: data.starterCode.python ?? "",
          cpp: data.starterCode.cpp ?? "",
          javascript: data.starterCode.javascript ?? "",
          // Problems don't ship TypeScript starter code; the JavaScript one is
          // valid TypeScript as-is (the judge declares `require`/`process`).
          typescript: data.starterCode.typescript || data.starterCode.javascript || "",
        });
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadErrorMessage(getErrorMessage(error, "Could not load this problem. It may not exist."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // `silent` re-checks the contest in place (after registering) without
  // flipping the gate back to "Checking contest…".
  const loadContest = useCallback((identifier: string, { silent = false }: { silent?: boolean } = {}) => {
    const requestId = ++contestRequestRef.current;
    if (!silent) setContestLoad({ status: "loading" });
    return getContestByIdentifier(identifier)
      .then((data) => {
        if (requestId !== contestRequestRef.current) return;
        setContest(data);
        setContestNow(Date.now());
        setContestLoad({ status: "ready" });
      })
      .catch((error) => {
        if (requestId !== contestRequestRef.current) return;
        if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
          setContest(null);
          setContestLoad({ status: "missing" });
        } else if (silent) {
          setRegisterError(getErrorMessage(error, "Couldn't refresh the contest — please reload the page."));
        } else {
          setContest(null);
          setContestLoad({ status: "error", message: getErrorMessage(error, "Could not load the contest.") });
        }
      });
  }, []);

  useEffect(() => {
    setRegisterError(null);
    if (!contestId) {
      contestRequestRef.current += 1; // ignore any in-flight contest response
      setContest(null);
      setContestLoad({ status: "idle" });
      return;
    }
    void loadContest(contestId);
  }, [contestId, loadContest]);

  useEffect(() => {
    if (!contestId) return;
    const interval = setInterval(() => setContestNow(Date.now()), CONTEST_TICK_MS);
    return () => clearInterval(interval);
  }, [contestId]);

  const contestGate = useMemo(
    () => getContestGate(contestId, contestLoad, contest, problem, contestNow),
    [contestId, contestLoad, contest, problem, contestNow],
  );
  // Run/Submit stay disabled until the contest is confirmed, and while it's
  // upcoming or the user isn't registered. An ended contest, a missing one or
  // a problem outside it is plain practice (submitted without a contestId).
  const contestBlocksActions =
    contestGate.kind === "loading" || contestGate.kind === "error" || contestGate.kind === "upcoming" || contestGate.kind === "unregistered";
  const submitContestId = contestGate.kind === "active" ? contestGate.contest.id : undefined;

  const registerFromBanner = async (target: ContestDetail) => {
    if (isRegistering) return;
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await registerForContest(target.id);
      await loadContest(contestId ?? target.id, { silent: true });
    } catch (error) {
      setRegisterError(error instanceof ApiError ? error.message : "Registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  const refreshHistory = (problemId: string) => {
    listSubmissions({ problemId, limit: 10 })
      .then((result) => {
        if (activeProblemIdRef.current === problemId) setHistory(result.items);
      })
      .catch(() => {
        // Not signed in, or request failed — history sidebar just stays empty.
      });
  };

  useEffect(() => {
    if (problem && user) refreshHistory(problem.id);
  }, [problem, user]);

  const code = codeByLanguage[language] ?? "";
  const setCode = (value: string) => setCodeByLanguage((prev) => ({ ...prev, [language]: value }));

  const limits = useMemo<RunLimits>(
    () => (problem ? { timeLimitMs: problem.timeLimitMs, memoryLimitMb: problem.memoryLimitMb } : DEFAULT_LIMITS),
    [problem],
  );

  const editorMarkers = useMemo<EditorMarker[]>(() => {
    if (runState.status !== "done" || !runSnapshot || runSnapshot.language !== language || runSnapshot.code !== code) return [];
    const primary = runState.result.cases[primaryCaseIndex(runState.result)];
    if (!primary) return [];
    const diagnostic = diagnoseCase(runSnapshot.language, primary, limits);
    if (diagnostic.line === undefined) return [];
    return [{ line: diagnostic.line, column: diagnostic.column, message: [diagnostic.title, diagnostic.message].filter(Boolean).join(": ") }];
  }, [runState, runSnapshot, language, code, limits]);

  const jumpToLine = (line: number) => setRevealRequest((previous) => ({ line, nonce: (previous?.nonce ?? 0) + 1 }));

  const runSample = async () => {
    if (!problem || isRunning || contestBlocksActions) return;
    if (!code.trim()) {
      setRunSnapshot(null);
      setRunState({ status: "error", message: "The editor is empty — write some code first." });
      return;
    }
    const problemId = problem.id;
    const snapshot = { language, code };
    setIsRunning(true);
    setRunState({ status: "running", sampleCount: Math.min(Math.max(problem.sampleTests.length, 1), 5) });
    try {
      const result = await runCode({ language, source: code, problemId });
      if (activeProblemIdRef.current !== problemId) return;
      // A back end from before per-sample results (e.g. mid-deploy) has no
      // `cases` — show a retryable message instead of crashing the panel.
      if (!Array.isArray(result?.cases)) throw new Error("The code runner sent an unexpected response. Please try again in a moment.");
      setRunSnapshot(snapshot);
      setRunState({ status: "done", result });
    } catch (error) {
      if (activeProblemIdRef.current !== problemId) return;
      setRunSnapshot(null);
      setRunState({ status: "error", message: getErrorMessage(error, "Couldn't reach the code runner. Please try again.") });
    } finally {
      setIsRunning(false);
      setRunCount((count) => count + 1);
    }
  };

  const submit = async () => {
    if (!problem || contestBlocksActions) return;
    if (!user) {
      setSubmitError("Sign in to submit your solution.");
      return;
    }
    if (!code.trim()) {
      setSubmitError("The editor is empty — write your solution before submitting.");
      return;
    }
    const problemId = problem.id;
    setIsSubmitting(true);
    setSubmitError(null);
    setGemsEarned(null);
    try {
      const result = await submitSolution({ problemId, code, language, contestId: submitContestId });
      if (activeProblemIdRef.current !== problemId) return;
      setSubmission(result);
      refreshHistory(problemId);
      if (result.gemsAwarded) {
        setGemsEarned(result.gemsAwarded);
        void refreshUser(); // updates the header's gem balance right away
      }
    } catch (error) {
      if (activeProblemIdRef.current !== problemId) return;
      setSubmitError(error instanceof ApiError ? error.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <PageLoader label="Loading problem…" />
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  if (status === "error" || !problem) {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <main className="section-shell problem-workspace">
          <p className="problem-list-status">{loadErrorMessage}</p>
          <Link className="text-link" href="/problems">
            ← Back to problems
          </Link>
        </main>
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className="section-shell problem-workspace">
        <div className="problem-workspace-head">
          <div>
            <p className="eyebrow">
              <b />
              {problem.difficulty} · {problem.basePoints} PTS
            </p>
            <h1>{problem.title}</h1>
            <div className="problem-meta">
              <span>Time limit: {problem.timeLimitMs}ms</span>
              <span>Memory: {problem.memoryLimitMb}MB</span>
              {problem.myBestVerdict && <span>Your best: {problem.myBestVerdict}</span>}
            </div>
          </div>
          <Link className="text-link" href="/problems">
            ← All problems
          </Link>
        </div>

        {contestGate.kind !== "none" && (
          <ContestGateBanner
            gate={contestGate}
            practiceHref={`/problems/${problem.slug}`}
            isRegistering={isRegistering}
            registerError={registerError}
            onRegister={registerFromBanner}
            onRetry={() => {
              if (contestId) void loadContest(contestId);
            }}
          />
        )}

        <div className="problem-workspace-grid">
          <section className="problem-statement">
            <div className="pane-head">
              <span>Problem</span>
              <span className={`pill pill-${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty} · {problem.basePoints} pts
              </span>
            </div>
            <div className="problem-statement-body">
              <h2>Statement</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{problem.statement}</p>
              {problem.inputFormat && (
                <>
                  <h2>Input format</h2>
                  <p style={{ whiteSpace: "pre-wrap" }}>{problem.inputFormat}</p>
                </>
              )}
              {problem.outputFormat && (
                <>
                  <h2>Output format</h2>
                  <p style={{ whiteSpace: "pre-wrap" }}>{problem.outputFormat}</p>
                </>
              )}
              {problem.constraints && (
                <>
                  <h2>Constraints</h2>
                  <p style={{ whiteSpace: "pre-wrap" }}>{problem.constraints}</p>
                </>
              )}
              <h2>Sample tests</h2>
              {problem.sampleTests.map((sample, index) => (
                <div key={index}>
                  <div className="iobox">
                    <span className="lab">Input {index + 1}</span>
                    {sample.input}
                  </div>
                  <div className="iobox">
                    <span className="lab">Output {index + 1}</span>
                    {sample.expectedOutput}
                  </div>
                  {sample.explanation && <p>{sample.explanation}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="editor-column">
            <div className="pane-head">
              <span>solution.{FILE_EXT[language]}</span>
              <span className="pane-head-state">
                {isSubmitting
                  ? "submitting…"
                  : isRunning
                    ? "running…"
                    : contestGate.kind === "loading"
                      ? "checking contest…"
                      : contestBlocksActions
                        ? "locked"
                        : "ready"}
              </span>
            </div>

            <MonacoEditor language={language} value={code} onChange={setCode} markers={editorMarkers} revealRequest={revealRequest} />

            <div className="edbar">
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language">
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === "cpp" ? "C++" : lang === "typescript" ? "TypeScript" : lang[0].toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
              <div className="button-row">
                <button
                  type="button"
                  className="button-outline button-small"
                  onClick={runSample}
                  disabled={isRunning || contestBlocksActions}
                  aria-describedby={contestBlocksActions ? CONTEST_GATE_BANNER_ID : undefined}
                >
                  {isRunning ? "Running…" : "Run"}
                </button>
                <button
                  type="button"
                  className="button button-small"
                  onClick={submit}
                  disabled={isSubmitting || contestBlocksActions}
                  aria-describedby={contestBlocksActions ? CONTEST_GATE_BANNER_ID : undefined}
                >
                  {isSubmitting ? "Submitting…" : "Submit"} <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            <RunResultPanel key={runCount} state={runState} language={runSnapshot?.language ?? language} limits={limits} onJumpToLine={jumpToLine} />

            {submitError && <p className="verdict-failed">{submitError}</p>}
            {gemsEarned !== null && gemsEarned > 0 && (
              <p className="gems-earned-note">✦ First solve — +{gemsEarned} gems added to your balance!</p>
            )}

            {history.length > 0 && (
              <div className="workspace-history">
                <h4>Recent submissions</h4>
                <div className="submission-history">
                  <table>
                    <thead>
                      <tr>
                        <th>Verdict</th>
                        <th>Tests</th>
                        <th>Score</th>
                        <th>Language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => {
                        const tone =
                          item.verdict === "ACCEPTED"
                            ? "ok"
                            : item.verdict === "TIME_LIMIT_EXCEEDED" || item.verdict === "MEMORY_LIMIT_EXCEEDED"
                              ? "warn"
                              : "bad";

                        return (
                          <tr key={item.id}>
                            <td>
                              <span className={`verdict-box verdict-box-${tone}`} style={{ display: "inline-block", padding: "2px 8px", fontSize: "11px" }}>
                                {item.verdict.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td>
                              {item.passedTests}/{item.totalTests}
                            </td>
                            <td>{item.score}</td>
                            <td>{item.language}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <AIPanelTabs
            problemId={problem.id}
            code={code}
            isSignedIn={Boolean(user)}
            submission={submission}
            initialHintTier={problem.myHintTier ?? 0}
            initialHintPenaltyPercent={problem.myHintPenaltyPercent ?? 0}
            onApplyRefactor={(refactoredCode) => {
              // The refactored code is in the submission's language, which may
              // not be the editor's currently-selected tab (the user could
              // have switched languages after submitting) — so switch to that
              // language too, not just overwrite whatever tab happens to be
              // open.
              if (!submission) return;
              setLanguage(submission.language);
              setCodeByLanguage((prev) => ({ ...prev, [submission.language]: refactoredCode }));
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
