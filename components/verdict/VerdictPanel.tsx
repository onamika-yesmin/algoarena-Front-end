import type { RunCaseResult, RunOutcome } from "@/lib/api/submissions";
import { diagnoseCase, type RunDiagnostic } from "@/lib/runDiagnostics";
import type { Submission } from "@/types/api";

const verdictLabel: Record<string, string> = {
  PENDING: "Pending",
  RUNNING: "Running…",
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
  RUNTIME_ERROR: "Runtime Error",
  COMPILATION_ERROR: "Compilation Error",
};

// Which .verdict-box-* tone each verdict reads as — accepted is the only
// "ok", limit/memory overruns are a softer "warn" (the code isn't wrong,
// it's just too slow/heavy), everything else concrete-wrong is "bad", and
// the in-flight states are neutral "info".
const verdictTone: Record<string, "ok" | "bad" | "warn" | "info"> = {
  PENDING: "info",
  RUNNING: "info",
  ACCEPTED: "ok",
  WRONG_ANSWER: "bad",
  TIME_LIMIT_EXCEEDED: "warn",
  MEMORY_LIMIT_EXCEEDED: "warn",
  RUNTIME_ERROR: "bad",
  COMPILATION_ERROR: "bad",
};

type FailureDescription = Pick<RunDiagnostic, "title" | "message" | "line" | "hint">;

// Plain-language explanation of a failed verdict, reusing the Run panel's
// diagnostics (lib/runDiagnostics.ts). Hidden tests only get general advice:
// their input, output and error details are never sent to the client.
const describeFailure = (submission: Submission): FailureDescription | null => {
  const failed = submission.failedTest;
  const onTest = failed ? ` on test #${failed.index + 1}` : "";

  if (submission.verdict === "TIME_LIMIT_EXCEEDED") {
    return {
      title: `Too slow${onTest}`,
      hint: "Your code didn't finish within the time limit. Look for a loop that never ends, or an approach that is too slow for the largest inputs in the constraints.",
    };
  }
  if (submission.verdict === "MEMORY_LIMIT_EXCEEDED") {
    return {
      title: `Used too much memory${onTest}`,
      hint: "Avoid huge arrays or strings, and check for recursion or loops that keep allocating.",
    };
  }
  if (submission.verdict !== "WRONG_ANSWER" && submission.verdict !== "RUNTIME_ERROR" && submission.verdict !== "COMPILATION_ERROR") return null;

  if (failed && !failed.isSample) {
    return submission.verdict === "WRONG_ANSWER"
      ? {
          title: `Wrong answer on hidden test #${failed.index + 1}`,
          hint: "Your code passes the visible cases but not this one. Think about edge cases: the smallest and largest inputs in the constraints, negative numbers, duplicates, and empty results.",
        }
      : {
          title: `Crashed on hidden test #${failed.index + 1}`,
          hint: "Something in your code breaks on an input you can't see. Check edge cases: index bounds, division by zero, empty input, and the largest values in the constraints.",
        };
  }

  const outcome: RunOutcome = submission.verdict;
  const asRunCase: RunCaseResult = {
    index: failed?.index ?? 0,
    input: failed?.input ?? "",
    expectedOutput: failed?.expectedOutput ?? null,
    outcome,
    stdout: outcome === "WRONG_ANSWER" ? (failed?.actualOutput ?? "") : "",
    stderr: outcome === "RUNTIME_ERROR" ? (submission.errorMessage ?? failed?.actualOutput ?? "") : "",
    compileOutput: outcome === "COMPILATION_ERROR" ? (submission.errorMessage ?? "") : "",
    exitCode: null,
    timeMs: null,
    memoryKb: null,
  };
  // Limits only matter for the time/memory hints, which are handled above.
  const diagnostic = diagnoseCase(submission.language, asRunCase, { timeLimitMs: 0, memoryLimitMb: 0 });
  return { ...diagnostic, title: outcome === "COMPILATION_ERROR" ? diagnostic.title : `${diagnostic.title}${onTest}` };
};

export default function VerdictPanel({ submission }: { submission: Submission }) {
  const tone = verdictTone[submission.verdict] ?? "info";
  const failure = describeFailure(submission);

  return (
    <div className="verdict-panel">
      <div className={`verdict-box verdict-box-${tone}`}>
        {verdictLabel[submission.verdict] ?? submission.verdict}
        <small>
          {submission.passedTests}/{submission.totalTests} tests · {submission.runtimeMs}ms · {submission.score} pts
        </small>
      </div>

      {submission.totalTests > 0 && (
        <div className="verdict-tgrid">
          {Array.from({ length: submission.totalTests }, (_, index) => (
            <div key={index} className={`verdict-tcell ${index < submission.passedTests ? "pass" : "fail"}`}>
              {index + 1}
            </div>
          ))}
        </div>
      )}

      {failure && (
        <div className={`verdict-diagnosis verdict-diagnosis-${tone}`}>
          <b>
            {failure.title}
            {failure.line !== undefined ? ` · line ${failure.line}` : ""}
          </b>
          {failure.message && <code>{failure.message}</code>}
          {failure.hint && (
            <p>
              <span aria-hidden="true">💡 </span>
              {failure.hint}
            </p>
          )}
        </div>
      )}

      {submission.errorMessage && (
        <div className="verdict-failed">
          <h4>Error</h4>
          <pre>{submission.errorMessage}</pre>
        </div>
      )}

      {submission.failedTest && (
        <div className="verdict-failed">
          <h4>Failed on test #{submission.failedTest.index + 1}</h4>
          <pre>Input: {submission.failedTest.input}</pre>
          <pre>Expected: {submission.failedTest.expectedOutput}</pre>
          <pre>Got: {submission.failedTest.actualOutput}</pre>
        </div>
      )}
    </div>
  );
}
