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

export default function VerdictPanel({ submission }: { submission: Submission }) {
  return (
    <div className="verdict-panel">
      <span className={`verdict-badge verdict-${submission.verdict}`}>{verdictLabel[submission.verdict] ?? submission.verdict}</span>

      <div className="verdict-stats">
        <div>
          <b>
            {submission.passedTests}/{submission.totalTests}
          </b>
          tests passed
        </div>
        <div>
          <b>{submission.runtimeMs} ms</b>
          runtime
        </div>
        <div>
          <b>{submission.score}</b>
          score
        </div>
      </div>

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
