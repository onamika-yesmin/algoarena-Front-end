"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getProblemBySlug } from "@/lib/api/problems";
import { listSubmissions, runCode, submitSolution } from "@/lib/api/submissions";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import type { Language, ProblemDetail, Submission } from "@/types/api";
import MonacoEditor from "@/components/editor/MonacoEditor";
import VerdictPanel from "@/components/verdict/VerdictPanel";
import HintPanel from "@/components/hints/HintPanel";
import { PageLoader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

const languages: Language[] = ["python", "cpp", "javascript"];

export default function ProblemDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = useAuth();

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [language, setLanguage] = useState<Language>("python");
  const [codeByLanguage, setCodeByLanguage] = useState<Partial<Record<Language, string>>>({});
  const [output, setOutput] = useState("Run your code against the first sample test to see output here.");
  const [isRunning, setIsRunning] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getProblemBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setProblem(data);
        setCodeByLanguage({
          python: data.starterCode.python ?? "",
          cpp: data.starterCode.cpp ?? "",
          javascript: data.starterCode.javascript ?? "",
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

  const refreshHistory = (problemId: string) => {
    listSubmissions({ problemId, limit: 10 })
      .then((result) => setHistory(result.items))
      .catch(() => {
        // Not signed in, or request failed — history sidebar just stays empty.
      });
  };

  useEffect(() => {
    if (problem && user) refreshHistory(problem.id);
  }, [problem, user]);

  const code = codeByLanguage[language] ?? "";
  const setCode = (value: string) => setCodeByLanguage((prev) => ({ ...prev, [language]: value }));

  const runSample = async () => {
    if (!problem) return;
    setIsRunning(true);
    setOutput("Running…");
    try {
      const sample = problem.sampleTests[0];
      const result = await runCode({ language, source: code, stdin: sample?.input ?? "" });
      const stage = result.run ?? result.compile;
      setOutput(stage?.output || stage?.stderr || "Finished with no output.");
    } catch (error) {
      setOutput(error instanceof ApiError ? error.message : "Execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const submit = async () => {
    if (!problem) return;
    if (!user) {
      setSubmitError("Sign in to submit your solution.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitSolution({ problemId: problem.id, code, language });
      setSubmission(result);
      refreshHistory(problem.id);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <>
        <SiteHeader />
        <PageLoader label="Loading problem…" />
        <SiteFooter />
      </>
    );
  }

  if (status === "error" || !problem) {
    return (
      <>
        <SiteHeader />
        <main className="section-shell problem-workspace">
          <p className="problem-list-status">{loadErrorMessage}</p>
          <Link className="text-link" href="/problems">
            ← Back to problems
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
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

      <div className="problem-workspace-grid">
        <section className="problem-statement">
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
              <pre>Input:{"\n"}{sample.input}</pre>
              <pre>Output:{"\n"}{sample.expectedOutput}</pre>
              {sample.explanation && <p>{sample.explanation}</p>}
            </div>
          ))}
        </section>

        <section className="editor-column">
          <div className="editor-toolbar">
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language">
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang === "cpp" ? "C++" : lang[0].toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
            <div className="button-row">
              <button type="button" className="button button-small" onClick={runSample} disabled={isRunning}>
                {isRunning ? "Running…" : "Run"}
              </button>
              <button type="button" className="button button-small" onClick={submit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>

          <MonacoEditor language={language} value={code} onChange={setCode} />

          <div className="output-panel">
            <h4>Output</h4>
            <pre>{output}</pre>
          </div>

          {submitError && <p className="verdict-failed">{submitError}</p>}
          {!user && <p className="problem-list-status">Sign in to submit and track your progress.</p>}

          {submission && <VerdictPanel submission={submission} />}

          {user && <HintPanel problemId={problem.id} code={code} />}

          {history.length > 0 && (
            <div className="submission-history">
              <h4>Recent submissions</h4>
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
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{item.verdict}</td>
                      <td>
                        {item.passedTests}/{item.totalTests}
                      </td>
                      <td>{item.score}</td>
                      <td>{item.language}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
