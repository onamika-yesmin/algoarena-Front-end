"use client";

import { useState } from "react";
import type { Language } from "@/types/api";
import type { RunCaseResult } from "@/lib/api/submissions";
import type { RunResult } from "@/lib/api/submissions";
import {
  OUTCOME_LABEL,
  OUTCOME_TONE,
  diagnoseCase,
  firstDifference,
  normalizeOutput,
  primaryCaseIndex,
  summarizeRun,
  type RunLimits,
  type RunTone,
} from "@/lib/runDiagnostics";
import styles from "./RunResultPanel.module.css";

export type RunState =
  | { status: "idle" }
  | { status: "running"; sampleCount: number }
  | { status: "error"; message: string }
  | { status: "done"; result: RunResult };

interface RunResultPanelProps {
  state: RunState;
  /** The language the shown result was produced in (may differ from the editor's current tab). */
  language: Language;
  limits: RunLimits;
  onJumpToLine?: (line: number) => void;
}

const TONE_ICON: Record<RunTone, string> = { ok: "✓", bad: "✕", warn: "!", info: "i" };
const toneClass = (tone: RunTone) => styles[`tone_${tone}`];

const formatTime = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`);
const formatMemory = (kb: number) => `${(kb / 1024).toFixed(1)} MB`;

function OutputBlock({
  label,
  text,
  highlightLine,
  highlightClass,
  emptyLabel,
}: {
  label: string;
  text: string;
  highlightLine?: number;
  highlightClass: string;
  emptyLabel: string;
}) {
  const normalized = normalizeOutput(text);
  const lines = normalized ? normalized.split("\n") : [];
  return (
    <div className={styles.ioBlock}>
      <span className={styles.ioLabel}>{label}</span>
      <pre className={styles.io}>
        {lines.length === 0 ? (
          <span className={styles.muted}>{emptyLabel}</span>
        ) : (
          lines.map((line, index) => (
            <span key={index} className={index + 1 === highlightLine ? highlightClass : styles.line}>
              {line || " "}
            </span>
          ))
        )}
      </pre>
    </div>
  );
}

function CaseDetails({
  result,
  language,
  limits,
  onJumpToLine,
}: {
  result: RunCaseResult;
  language: Language;
  limits: RunLimits;
  onJumpToLine?: (line: number) => void;
}) {
  const diagnostic = diagnoseCase(language, result, limits);
  const isProblem = OUTCOME_TONE[result.outcome] === "bad" || OUTCOME_TONE[result.outcome] === "warn";
  const difference = result.outcome === "WRONG_ANSWER" && result.expectedOutput !== null ? firstDifference(result.expectedOutput, result.stdout) : null;
  const rawError = result.compileOutput || result.stderr;
  const ran = result.outcome !== "COMPILATION_ERROR" && result.outcome !== "SKIPPED";
  const errorLine = diagnostic.line;

  return (
    <div className={styles.details}>
      {isProblem && (
        <div className={`${styles.diagnostic} ${toneClass(diagnostic.tone)}`}>
          <div className={styles.diagnosticHead}>
            <b>{diagnostic.title}</b>
            {errorLine !== undefined && (
              <button type="button" className={styles.lineButton} onClick={() => onJumpToLine?.(errorLine)}>
                Line {errorLine}
                {diagnostic.column ? `:${diagnostic.column}` : ""} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          {diagnostic.message && <code className={styles.message}>{diagnostic.message}</code>}
          {diagnostic.hint && (
            <p className={styles.hint}>
              <span aria-hidden="true">💡 </span>
              {diagnostic.hint}
            </p>
          )}
        </div>
      )}

      {result.outcome === "SKIPPED" && <p className={styles.passHint}>{diagnostic.hint}</p>}

      <div className={styles.ioGrid}>
        <div className={styles.ioBlock}>
          <span className={styles.ioLabel}>Input</span>
          <pre className={styles.io}>{result.input ? result.input : <span className={styles.muted}>(empty)</span>}</pre>
        </div>
        {result.expectedOutput !== null && (
          <OutputBlock label="Expected output" text={result.expectedOutput} highlightLine={difference?.line} highlightClass={styles.lineGood} emptyLabel="(empty)" />
        )}
        {ran && (
          <OutputBlock
            label={result.outcome === "RUNTIME_ERROR" || result.outcome === "TIME_LIMIT_EXCEEDED" || result.outcome === "MEMORY_LIMIT_EXCEEDED" ? "Output before it stopped" : "Your output"}
            text={result.stdout}
            highlightLine={difference?.line}
            highlightClass={styles.lineBad}
            emptyLabel="(no output)"
          />
        )}
      </div>

      {rawError.trim() && (
        <details className={styles.raw} open={result.outcome === "COMPILATION_ERROR"}>
          <summary>{result.outcome === "COMPILATION_ERROR" ? "Compiler output" : "Full error output (stderr)"}</summary>
          <pre>{rawError}</pre>
        </details>
      )}
    </div>
  );
}

export default function RunResultPanel({ state, language, limits, onJumpToLine }: RunResultPanelProps) {
  // Which sample's details are open; null = the first failing sample. The
  // parent remounts this panel (key) for every new run, which resets it.
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className={styles.panel} aria-live="polite" aria-label="Run result">
      <div className={styles.head}>
        <h4>Run result</h4>
      </div>

      {state.status === "idle" && (
        <p className={styles.empty}>
          Press <b>Run</b> to test your code on the sample tests. You&apos;ll see whether each sample passed — or exactly what went wrong: the wrong line of
          output, the error and the line it happened on, or a timeout.
        </p>
      )}

      {state.status === "running" && (
        <div className={`${styles.banner} ${styles.tone_info}`}>
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <b>Running your code…</b>
            <small>
              on {state.sampleCount} sample test{state.sampleCount === 1 ? "" : "s"}
            </small>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className={`${styles.banner} ${styles.tone_warn}`} role="alert">
          <span className={styles.icon} aria-hidden="true">
            {TONE_ICON.warn}
          </span>
          <div>
            <b>Couldn&apos;t run your code</b>
            <small>{state.message}</small>
          </div>
        </div>
      )}

      {state.status === "done" &&
        (() => {
          const { result } = state;
          const summary = summarizeRun(language, result, limits);
          const activeIndex = selected ?? primaryCaseIndex(result);
          const active = result.cases[activeIndex];
          const maxTime = Math.max(0, ...result.cases.map((item) => item.timeMs ?? 0));
          const maxMemory = Math.max(0, ...result.cases.map((item) => item.memoryKb ?? 0));
          const stats = [
            result.outcome === "NO_EXPECTED" || result.outcome === "COMPILATION_ERROR" ? null : `${result.passed}/${result.total} sample${result.total === 1 ? "" : "s"} passed`,
            maxTime ? formatTime(maxTime) : null,
            maxMemory ? formatMemory(maxMemory) : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <>
              <div className={`${styles.banner} ${toneClass(summary.tone)}`} role={summary.tone === "ok" ? "status" : "alert"}>
                <span className={styles.icon} aria-hidden="true">
                  {TONE_ICON[summary.tone]}
                </span>
                <div>
                  <b>{summary.title}</b>
                  {stats && <small>{stats}</small>}
                </div>
              </div>
              {result.outcome === "PASSED" && summary.hint && <p className={styles.passHint}>{summary.hint}</p>}

              {result.cases.length > 1 && (
                <div className={styles.chips} role="tablist" aria-label="Sample tests">
                  {result.cases.map((item, index) => {
                    const tone = OUTCOME_TONE[item.outcome];
                    return (
                      <button
                        key={item.index}
                        type="button"
                        role="tab"
                        aria-selected={index === activeIndex}
                        title={OUTCOME_LABEL[item.outcome]}
                        className={`${styles.chip} ${toneClass(tone)} ${index === activeIndex ? styles.chipActive : ""}`}
                        onClick={() => setSelected(index)}
                      >
                        <span aria-hidden="true">{TONE_ICON[tone]}</span> Sample {item.index + 1}
                        <span className={styles.chipLabel}>{OUTCOME_LABEL[item.outcome]}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {active && <CaseDetails result={active} language={language} limits={limits} onJumpToLine={onJumpToLine} />}
            </>
          );
        })()}
    </section>
  );
}
