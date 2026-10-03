"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getQuizResult } from "@/lib/api/quiz";
import { getErrorMessage } from "@/lib/api/client";
import type { QuizSessionResultBreakdown } from "@/types/quiz";
import styles from "../../quiz.module.css";

export default function QuizResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [result, setResult] = useState<QuizSessionResultBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await getQuizResult(sessionId);
        setResult(data);
      } catch (err) {
        setErrorMsg(getErrorMessage(err, "Failed to load quiz result summary."));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchResults();
  }, [sessionId]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <main className={`section-shell ${styles.page}`} style={{ textAlign: "center", paddingTop: 100 }}>
          <div className="aa-spinner" style={{ width: 36, height: 36, margin: "0 auto 16px" }} />
          <p className={styles.fieldLabel}>Calculating Score & Explanation Breakdown…</p>
        </main>
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  if (errorMsg || !result) {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <main className={`section-shell ${styles.page}`}>
          <div className={styles.configPanel} style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
            <h2 className={styles.sectionTitle}>Results Unavailable</h2>
            <p className={styles.lede}>{errorMsg || "Quiz result data not found."}</p>
            <Link href="/quiz" className="button button-small" style={{ marginTop: 16 }}>
              ← Back to Quiz Hub
            </Link>
          </div>
        </main>
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  // Difficulty points map matching backend rules
  const DIFFICULTY_POINTS: Record<string, number> = {
    EASY: 2,
    MEDIUM: 3,
    HARD: 5,
  };

  // Calculate statistics
  const totalQs = result.questions.length;
  const correctCount =
    result.correctCount ??
    result.questions.filter((q) => q.isCorrect).length;

  const maxPossibleScore =
    result.maxPossibleScore ||
    result.questions.reduce(
      (acc, q) => acc + (DIFFICULTY_POINTS[q.difficulty] || 2),
      0,
    );

  const practicePointsEarned = result.questions.reduce((acc, q) => {
    if (q.isCorrect) {
      return acc + (DIFFICULTY_POINTS[q.difficulty] || 2);
    }
    return acc;
  }, 0);

  const accuracyPercent = totalQs > 0 ? Math.round((correctCount / totalQs) * 100) : 0;
  const totalTimeSeconds = result.questions.reduce(
    (acc, q) => acc + (q.timeTakenSeconds || 0),
    0,
  );
  const totalTimeMinutes = Math.round((totalTimeSeconds / 60) * 10) / 10;

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className={`section-shell ${styles.page}`}>
        {/* Top Header Banner */}
        <section className={styles.head} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="eyebrow">
              <b />
              QUIZ COMPLETED
            </p>
            <h1>Session Breakdown</h1>
            <p className={styles.lede}>
              Review your overall performance, awarded XP/Gems, and detailed question explanations below.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/quiz" className="button button-small">
              Take Another Quiz →
            </Link>
            <Link
              href="/"
              className="button button-small"
              style={{ background: "#12172b", borderColor: "#303854", color: "#c3c8dd" }}
            >
              Back to Home
            </Link>
          </div>
        </section>

        {/* Dynamic Summary Cards Grid */}
        <div className={styles.resultsSummaryGrid}>
          {/* Card 1: Score or Correct Answers */}
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              {result.mode === "EXAM" ? "Total Score" : "Correct Answers"}
            </span>
            <div className={styles.statValue}>
              {result.mode === "EXAM" ? (
                <>
                  {result.score}{" "}
                  <span style={{ fontSize: 16, color: "#8f96ad" }}>
                    / {maxPossibleScore}
                  </span>
                </>
              ) : (
                <>
                  {correctCount}{" "}
                  <span style={{ fontSize: 16, color: "#8f96ad" }}>
                    / {totalQs}
                  </span>
                </>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#8f96ad" }}>
              {result.mode === "EXAM"
                ? `${correctCount} of ${totalQs} Correct`
                : `${practicePointsEarned} of ${maxPossibleScore} Practice Pts`}
            </span>
          </div>

          {/* Card 2: Accuracy */}
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Accuracy</span>
            <div className={styles.statValue} style={{ color: accuracyPercent >= 70 ? "#65dfad" : "#ffb254" }}>
              {accuracyPercent}%
            </div>
            <span style={{ fontSize: 11, color: "#8f96ad" }}>
              {correctCount} Correct • {totalQs - correctCount} Wrong
            </span>
          </div>

          {/* Card 3: Time Taken */}
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Time Taken</span>
            <div className={styles.statValue}>
              {totalTimeMinutes} <span style={{ fontSize: 16, color: "#8f96ad" }}>min</span>
            </div>
          </div>

          {/* Card 4: Earned Gems */}
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Earned Gems</span>
            <div className={styles.statValue} style={{ color: "#55d8d2", display: "flex", alignItems: "center", gap: 6 }}>
              <span>💎 +{result.earnedGems || 0}</span>
            </div>
            <span style={{ fontSize: 11, color: "#8f96ad" }}>
              {result.mode === "EXAM" ? "Exam Mode Reward" : "Practice Mode (No Gems)"}
            </span>
          </div>
        </div>

        {/* Detailed Question-by-Question Review List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <h2 className={styles.sectionTitle} style={{ borderBottom: "1px solid #262e4f", paddingBottom: 12 }}>
            Detailed Explanation Review ({totalQs} Questions)
          </h2>

          {result.questions.map((q, idx) => {
            const userAnsIdx = typeof q.userAnswer === "number" ? q.userAnswer : Number(q.userAnswer ?? -1);
            const correctAnsIdx = typeof q.correctAnswer === "number" ? q.correctAnswer : Number(q.correctAnswer ?? 0);
            const isUserCorrect = q.isCorrect ?? (userAnsIdx === correctAnsIdx);

            return (
              <div key={q.questionId || idx} className={styles.questionCard}>
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div className={styles.badgeRow}>
                    <span style={{ font: "700 12px DM Mono", color: "#8f96ad" }}>
                      Q{idx + 1}.
                    </span>
                    <span
                      className={`${styles.badgeTag} ${q.difficulty === "EASY"
                        ? styles.badgeEasy
                        : q.difficulty === "MEDIUM"
                          ? styles.badgeMedium
                          : styles.badgeHard
                        }`}
                    >
                      {q.difficulty}
                    </span>
                    <span className={`${styles.badgeTag} ${styles.badgeType}`}>
                      {q.type.replace("_", " ")}
                    </span>
                  </div>

                  <span
                    className={`${styles.modePill}`}
                    style={{
                      background: isUserCorrect ? "rgba(101, 223, 173, 0.15)" : "rgba(255, 128, 128, 0.15)",
                      borderColor: isUserCorrect ? "rgba(101, 223, 173, 0.35)" : "rgba(255, 128, 128, 0.35)",
                      color: isUserCorrect ? "#65dfad" : "#ff8080",
                    }}
                  >
                    {isUserCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                </div>

                {/* Question Text */}
                <h3 className={styles.questionText}>{q.questionText}</h3>

                {/* Code Snippet Box */}
                {q.codeSnippet && (
                  <div className={styles.codeBox}>
                    <div className={styles.codeHeader}>
                      <span>{q.codeSnippet.language || "code"}</span>
                      <span style={{ color: "#8f96ad" }}>Code Viewer</span>
                    </div>
                    <pre className={styles.codePre}>
                      <code>{q.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}

                {/* Options Review List */}
                <div className={styles.optionsList}>
                  {q.options.map((optionText, optIdx) => {
                    const isSelected = userAnsIdx === optIdx;
                    const isTargetCorrect = correctAnsIdx === optIdx;

                    let optClass = styles.optionCard;
                    if (isTargetCorrect) {
                      optClass = `${styles.optionCard} ${styles.optionCorrect}`;
                    } else if (isSelected && !isUserCorrect) {
                      optClass = `${styles.optionCard} ${styles.optionWrong}`;
                    }

                    const optionLetter = String.fromCharCode(65 + optIdx);

                    return (
                      <div key={optIdx} className={optClass} style={{ cursor: "default" }}>
                        <div className={styles.optionLetter}>{optionLetter}</div>
                        <div style={{ flex: 1 }}>
                          <div className={styles.optionText}>{optionText}</div>
                          {isSelected && (
                            <span style={{ fontSize: 11, fontWeight: 700, marginTop: 4, display: "inline-block" }}>
                              {isUserCorrect ? "✓ Your Selection" : "✗ Your Selection"}
                            </span>
                          )}
                          {!isSelected && isTargetCorrect && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#65dfad", marginTop: 4, display: "inline-block" }}>
                              ✓ Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {q.explanation && (
                  <div className={styles.explanationBox}>
                    <div style={{ fontWeight: 700, color: "#ffffff", marginBottom: 6, fontFamily: "DM Mono", fontSize: 12 }}>
                      📘 Explanation:
                    </div>
                    <div>{q.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Navigation Bar */}
        <div className={styles.actionsBar} style={{ marginTop: 40 }}>
          <Link href="/quiz" className="button button-small">
            Take Another Quiz →
          </Link>
          <Link
            href="/problems"
            className="button button-small"
            style={{ background: "#12172b", borderColor: "#303854", color: "#c3c8dd" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
