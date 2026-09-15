"use client";

import { useEffect, useRef, useState } from "react";
import { runCode } from "@/lib/api/submissions";
import { explainCase, explainRunFailure, starsForPython, type PythonFeedback } from "@/lib/kids/pythonFeedback";
import type { PythonLevel as PythonLevelData } from "@/lib/kids/types";
import { Mascot } from "../Mascot";
import { RichText } from "../StarRow";
import { CodeBlock, KidsCodeEditor } from "./KidsCodeEditor";
import ui from "../kidsUi.module.css";
import styles from "./PythonLevel.module.css";

interface PythonLevelProps {
  level: PythonLevelData;
  onSolved: (stars: 1 | 2 | 3) => void;
}

const typedText = (stdin: string) => stdin.trim().split("\n").join(" and ");

function OutputLines({ text, highlight, tone }: { text: string; highlight: number | null; tone: "good" | "bad" }) {
  const lines = text ? text.split("\n") : [];
  return (
    <pre className={styles.output}>
      {lines.length === 0 ? (
        <span className={styles.muted}>(nothing printed)</span>
      ) : (
        lines.map((line, index) => (
          <span key={index} className={index + 1 === highlight ? (tone === "good" ? styles.lineGood : styles.lineBad) : styles.outLine}>
            {line || " "}
          </span>
        ))
      )}
    </pre>
  );
}

export function PythonLevel({ level, onSolved }: PythonLevelProps) {
  const [code, setCode] = useState(level.starterCode);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<PythonFeedback | null>(null);
  const [checkedCode, setCheckedCode] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  const usesInput = level.tests.some((test) => test.stdin !== undefined);
  const firstTest = level.tests[0];

  const check = async () => {
    if (checking) return;
    if (!code.trim()) {
      setFeedback({ kind: "unavailable", title: "Your editor is empty", tip: "Type some code first, then check it." });
      return;
    }
    const snapshot = code;
    setChecking(true);
    try {
      let outcome: PythonFeedback | null = null;
      // Later tests only run once earlier ones pass — fewer runs against the rate limit.
      for (const [testIndex, test] of level.tests.entries()) {
        const result = await runCode({ language: "python", source: snapshot, ...(test.stdin !== undefined ? { stdin: test.stdin } : {}) });
        const firstCase = Array.isArray(result?.cases) ? result.cases[0] : undefined;
        if (!firstCase) throw new Error("Unexpected response from the code runner.");
        outcome = explainCase(firstCase, test, { testIndex, levelUsesInput: usesInput });
        if (outcome.kind !== "success") break;
      }
      if (!aliveRef.current || !outcome) return;
      if (outcome.kind === "unavailable") {
        setFeedback(outcome);
        return;
      }
      const tries = checks + 1;
      setChecks(tries);
      setFeedback(outcome);
      setCheckedCode(snapshot);
      if (outcome.kind === "success") onSolved(starsForPython({ checks: tries, hintsUsed: hintsShown, sawAnswer: answerShown }));
    } catch (error) {
      if (aliveRef.current) setFeedback(explainRunFailure(error));
    } finally {
      if (aliveRef.current) setChecking(false);
    }
  };

  const resetCode = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setCode(level.starterCode);
    setFeedback(null);
    setCheckedCode(null);
  };

  const errorLine = feedback?.kind === "error" && checkedCode === code ? (feedback.line ?? null) : null;
  const canPeek = checks >= 3 && hintsShown >= level.hints.length && feedback?.kind !== "success";

  return (
    <div className={styles.layout}>
      <section className={`${ui.card} ${styles.lesson}`} aria-labelledby="kq-learn-title">
        <h2 id="kq-learn-title">
          <span aria-hidden="true">📘</span> Learn
        </h2>
        <ul className={styles.learnList}>
          {level.learn.map((point, index) => (
            <li key={index}>
              <RichText text={point} />
            </li>
          ))}
        </ul>

        <div className={styles.example}>
          <span className={styles.label}>Example</span>
          <CodeBlock code={level.example.code} />
          {level.example.stdin !== undefined && (
            <p className={styles.typed}>
              If someone types <code className={ui.inlineCode}>{typedText(level.example.stdin)}</code>, it prints:
            </p>
          )}
          <span className={styles.label}>Output</span>
          <OutputLines text={level.example.output} highlight={null} tone="good" />
        </div>

        <h2>
          <span aria-hidden="true">🎯</span> Your mission
        </h2>
        <p className={styles.task}>
          <RichText text={level.task} />
        </p>
        <span className={styles.label}>
          {firstTest.stdin !== undefined ? `Goal output when the tester types ${typedText(firstTest.stdin)}` : "Goal output"}
        </span>
        <OutputLines text={firstTest.expected} highlight={null} tone="good" />

        <div className={styles.hints}>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`}
            onClick={() => setHintsShown((count) => Math.min(count + 1, level.hints.length))}
            disabled={hintsShown >= level.hints.length}
          >
            <span aria-hidden="true">💡</span> {hintsShown === 0 ? "Need a hint?" : hintsShown < level.hints.length ? "Another hint" : "No more hints"}
          </button>
          {hintsShown > 0 && (
            <ol className={styles.hintList} aria-live="polite">
              {level.hints.slice(0, hintsShown).map((hint, index) => (
                <li key={index}>
                  <RichText text={hint} />
                </li>
              ))}
            </ol>
          )}
          {canPeek && !answerShown && (
            <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={() => setAnswerShown(true)}>
              <span aria-hidden="true">👀</span> Show me the answer
            </button>
          )}
          {answerShown && (
            <div className={styles.answer}>
              <p>Peeking is okay! This level will give 1 star now. Try typing it yourself so it sticks.</p>
              <CodeBlock code={level.solution} />
              <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={() => setCode(level.solution)}>
                Put it in my editor
              </button>
            </div>
          )}
        </div>
      </section>

      <section className={`${ui.card} ${styles.workbench}`} aria-labelledby="kq-code-title">
        <div className={styles.benchHead}>
          <h2 id="kq-code-title">
            <span aria-hidden="true">🐍</span> <span className={styles.fileName}>main.py</span>
          </h2>
          <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={resetCode} disabled={checking}>
            <span aria-hidden="true">↺</span> {confirmReset ? "Tap again to start over" : "Start over"}
          </button>
        </div>

        <KidsCodeEditor value={code} onChange={setCode} label={`Python code for ${level.title}`} errorLine={errorLine} disabled={checking} />

        <div className={styles.actions}>
          <button type="button" className={`${ui.btn} ${ui.btnGo} ${styles.checkButton}`} onClick={check} disabled={checking}>
            <span aria-hidden="true">▶</span> {checking ? "Checking…" : "Check my code"}
          </button>
          {checks > 0 && (
            <span className={styles.tries}>
              {checks} {checks === 1 ? "try" : "tries"}
            </span>
          )}
        </div>

        <div aria-live="polite">
          {checking ? (
            <div className={`${styles.banner} ${styles.info}`} role="status">
              <Mascot mood="think" size={56} />
              <div>
                <b>Bolt is running your code…</b>
                <p>Hang on a second!</p>
              </div>
            </div>
          ) : feedback?.kind === "success" ? (
            <div className={`${styles.banner} ${styles.good}`} role="status">
              <Mascot mood="cheer" size={56} animated={false} />
              <div>
                <b>You did it!</b>
                <p>Your output matches the goal exactly.</p>
                <OutputLines text={feedback.output} highlight={null} tone="good" />
              </div>
            </div>
          ) : feedback?.kind === "wrong" ? (
            <div className={`${styles.banner} ${styles.bad}`} role="alert">
              <Mascot mood="think" size={56} animated={false} />
              <div className={styles.bannerBody}>
                <b>Not quite yet!</b>
                <p>
                  <RichText text={feedback.tip} />
                </p>
                {feedback.stdin !== undefined && <p className={styles.typed}>When the tester typed {typedText(feedback.stdin)}:</p>}
                <div className={styles.compare}>
                  <div>
                    <span className={styles.label}>Goal</span>
                    <OutputLines text={feedback.expected} highlight={feedback.diffLine} tone="good" />
                  </div>
                  <div>
                    <span className={styles.label}>Your program printed</span>
                    <OutputLines text={feedback.actual} highlight={feedback.diffLine} tone="bad" />
                  </div>
                </div>
              </div>
            </div>
          ) : feedback?.kind === "error" ? (
            <div className={`${styles.banner} ${styles.bad}`} role="alert">
              <Mascot mood="oops" size={56} animated={false} />
              <div className={styles.bannerBody}>
                <b>{feedback.title}</b>
                <p>
                  <RichText text={feedback.tip} />
                </p>
                {feedback.stdin !== undefined && <p className={styles.typed}>This happened when the tester typed {typedText(feedback.stdin)}.</p>}
                {feedback.details && (
                  <details className={styles.details}>
                    <summary>What Python said</summary>
                    <pre>{feedback.details}</pre>
                  </details>
                )}
              </div>
            </div>
          ) : feedback?.kind === "unavailable" ? (
            <div className={`${styles.banner} ${styles.warn}`} role="alert">
              <Mascot mood="think" size={56} animated={false} />
              <div>
                <b>{feedback.title}</b>
                <p>{feedback.tip}</p>
              </div>
            </div>
          ) : (
            <p className={styles.idle}>
              Write your code, then press <b>Check my code</b>. Bolt will run it and compare it with the goal.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
