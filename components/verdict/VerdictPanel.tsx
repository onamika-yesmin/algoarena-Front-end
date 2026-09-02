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

export default function VerdictPanel({ submission }: { submission: Submission }) {
  const tone = verdictTone[submission.verdict] ?? "info";

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
