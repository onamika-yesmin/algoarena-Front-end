"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { submitQuizAnswers } from "@/lib/api/quiz";
import { getErrorMessage } from "@/lib/api/client";
import type {
  StartQuizResult,
  UserAnswerPayload,
  QuizQuestionPublic,
} from "@/types/quiz";
import styles from "../quiz.module.css";

export default function QuizExecutionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;
  const router = useRouter();

  const [sessionData, setSessionData] = useState<StartQuizResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [timeTakenMap, setTimeTakenMap] = useState<Record<string, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [practiceNotes, setPracticeNotes] = useState<Record<string, boolean>>({});

  const questionStartTimeRef = useRef<number>(Date.now());
  const isSubmittingRef = useRef<boolean>(false);

  // 1. Load Session Data from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`algoarena_quiz_session_${sessionId}`);
      if (stored) {
        const parsed: StartQuizResult = JSON.parse(stored);
        setSessionData(parsed);

        // If EXAM mode, calculate remaining timer seconds
        if (parsed.mode === "EXAM" && parsed.expiresAt) {
          const diff = Math.max(
            0,
            Math.floor((new Date(parsed.expiresAt).getTime() - Date.now()) / 1000),
          );
          setRemainingSeconds(diff);
        }
      } else {
        setErrorMsg("Quiz session not found or expired. Please start a new quiz.");
      }
    } catch {
      setErrorMsg("Failed to load active quiz session.");
    }
  }, [sessionId]);

  const getQId = useCallback((q?: QuizQuestionPublic | null) => {
    if (!q) return "";
    return q._id || q.questionId || "";
  }, []);

  // 2. Submit Handler
  const handleSubmitQuiz = useCallback(async () => {
    if (isSubmittingRef.current || !sessionData) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: UserAnswerPayload[] = sessionData.questions.map((q) => {
        const qId = getQId(q);
        return {
          questionId: qId,
          userAnswer: userAnswers[qId] ?? -1,
          timeTakenSeconds: timeTakenMap[qId] || 0,
        };
      });

      await submitQuizAnswers(sessionId, payload);

      sessionStorage.removeItem(`algoarena_quiz_session_${sessionId}`);
      router.push(`/quiz/${sessionId}/result`);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to submit quiz answers."));
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [sessionData, sessionId, userAnswers, timeTakenMap, router, getQId]);

  // 3. Exam Countdown Timer Effect
  useEffect(() => {
    if (sessionData?.mode !== "EXAM" || remainingSeconds === null) return;

    if (remainingSeconds <= 0) {
      void handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          void handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData?.mode, remainingSeconds, handleSubmitQuiz]);

  // 4. Handle Option Selection & Time Tracking
  const handleSelectOption = (qId: string, optionIndex: number) => {
    const now = Date.now();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((now - questionStartTimeRef.current) / 1000),
    );

    setUserAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
    setTimeTakenMap((prev) => ({
      ...prev,
      [qId]: (prev[qId] || 0) + elapsedSeconds,
    }));
    questionStartTimeRef.current = now;
  };

  // 5. Handle Question Switch
  const handleJumpToQuestion = (index: number) => {
    const currentQ = sessionData?.questions[currentIndex];
    const currentQId = getQId(currentQ);
    if (currentQId) {
      const now = Date.now();
      const elapsedSeconds = Math.max(
        1,
        Math.floor((now - questionStartTimeRef.current) / 1000),
      );
      setTimeTakenMap((prev) => ({
        ...prev,
        [currentQId]: (prev[currentQId] || 0) + elapsedSeconds,
      }));
    }
    questionStartTimeRef.current = Date.now();
    setCurrentIndex(index);
  };

  // Formatting Timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (errorMsg && !sessionData) {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <main className={`section-shell ${styles.page}`}>
          <div className={styles.configPanel} style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
            <h2 className={styles.sectionTitle}>Session Unavailable</h2>
            <p className={styles.lede}>{errorMsg}</p>
            <Link href="/quiz" className="button button-small" style={{ marginTop: 16 }}>
              ← Return to Quiz Hub
            </Link>
          </div>
        </main>
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  if (!sessionData) {
    return (
      <ProtectedRoute>
        <SiteHeader />
        <main className={`section-shell ${styles.page}`} style={{ textAlign: "center", paddingTop: 100 }}>
          <div className="aa-spinner" style={{ width: 32, height: 32, margin: "0 auto 16px" }} />
          <p className={styles.fieldLabel}>Loading Quiz Workspace…</p>
        </main>
        <SiteFooter />
      </ProtectedRoute>
    );
  }

  const currentQuestion: QuizQuestionPublic = sessionData.questions[currentIndex];
  const isLastQuestion = currentIndex === sessionData.questions.length - 1;
  const totalQuestions = sessionData.questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className={`section-shell ${styles.page}`}>
        {/* Workspace Top Header Bar */}
        <div className={styles.workspaceHeader}>
          <div className={styles.workspaceHeaderLeft}>
            <div className={styles.metaRow}>
              <span className="eyebrow" style={{ margin: 0 }}>
                TOPIC: {sessionData.questions[0]?.topic.toUpperCase() || "ALGORITHMS"}
              </span>
              <span
                className={`${styles.modePill} ${sessionData.mode === "EXAM"
                    ? styles.modePillExam
                    : styles.modePillPractice
                  }`}
              >
                {sessionData.mode} MODE
              </span>
            </div>
            <h1 className={styles.workspaceTitle}>
              Question {currentIndex + 1} of {totalQuestions}
            </h1>
          </div>

          {/* Timer & Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {sessionData.mode === "EXAM" && remainingSeconds !== null && (
              <div
                className={`${styles.timerBox} ${remainingSeconds < 60 ? styles.timerWarning : ""
                  }`}
              >
                <span style={{ fontSize: 11, color: "#8f96ad", textTransform: "uppercase" }}>Time Left:</span>
                {formatTime(remainingSeconds)}
              </div>
            )}

            <div className={styles.progressWrap}>
              <div className={styles.progressLabel}>
                Answered: {answeredCount}/{totalQuestions} ({progressPercent}%)
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question Count Pool Notification */}
        {totalQuestions < 5 && (
          <div className={styles.insightBox} style={{ marginBottom: 20, borderColor: "rgba(85, 216, 210, 0.35)", background: "rgba(85, 216, 210, 0.08)" }}>
            <span style={{ color: "#55d8d2", fontWeight: 700 }}>Note:</span> Showing {totalQuestions} available approved questions for this topic and difficulty.
          </div>
        )}

        {/* Error Alert Display */}
        {errorMsg && (
          <div className={styles.errorMessage} style={{ marginBottom: 20 }}>
            {errorMsg}
          </div>
        )}

        {/* Question Pill Navigator */}
        <div className={styles.pillNav}>
          {sessionData.questions.map((q, idx) => {
            const qId = getQId(q);
            const isCurrent = idx === currentIndex;
            const isAnswered = userAnswers[qId] !== undefined;

            let pillClass = styles.pillBtn;
            if (isCurrent) {
              pillClass = `${styles.pillBtn} ${styles.pillBtnActive}`;
            } else if (isAnswered) {
              pillClass = `${styles.pillBtn} ${styles.pillBtnAnswered}`;
            }

            return (
              <button
                key={qId || idx}
                type="button"
                onClick={() => handleJumpToQuestion(idx)}
                className={pillClass}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Main Question Display Grid */}
        <div className={styles.workspaceGrid}>
          {/* Question Text & Code Snippet Column */}
          <div className={styles.questionCard}>
            {/* Badges */}
            <div className={styles.badgeRow}>
              <span
                className={`${styles.badgeTag} ${
                  currentQuestion.difficulty === "EASY"
                    ? styles.badgeEasy
                    : currentQuestion.difficulty === "MEDIUM"
                      ? styles.badgeMedium
                      : styles.badgeHard
                }`}
              >
                {currentQuestion.difficulty}
              </span>
              <span className={`${styles.badgeTag} ${styles.badgeType}`}>
                {currentQuestion.type.replace("_", " ")}
              </span>
            </div>

            {/* Question Text */}
            <h2 className={styles.questionText}>{currentQuestion.questionText}</h2>

            {/* Code Snippet Box */}
            {currentQuestion.codeSnippet && (
              <div className={styles.codeBox}>
                <div className={styles.codeHeader}>
                  <span>{currentQuestion.codeSnippet.language || "code"}</span>
                  <span style={{ color: "#8f96ad" }}>Code Viewer</span>
                </div>
                <pre className={styles.codePre}>
                  <code>{currentQuestion.codeSnippet.code}</code>
                </pre>
              </div>
            )}

            {/* Practice Mode Interactive Explanation Note */}
            {sessionData.mode === "PRACTICE" && (
              <div className={styles.insightBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "#c9bbff", fontWeight: 700, fontFamily: "DM Mono" }}>
                    💡 Practice Insight
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const curQId = getQId(currentQuestion);
                      setPracticeNotes((prev) => ({
                        ...prev,
                        [curQId]: !prev[curQId],
                      }));
                    }}
                    style={{ background: "none", border: "none", color: "#55d8d2", cursor: "pointer", fontWeight: 600 }}
                  >
                    {practiceNotes[getQId(currentQuestion)]
                      ? "Hide Note"
                      : "Reveal Explanation Note"}
                  </button>
                </div>
                {practiceNotes[getQId(currentQuestion)] ? (
                  <p style={{ margin: "6px 0 0", color: "#d4d9ec" }}>
                    Select the option that best balances runtime constraints or code
                    output behavior. Submit your session to unlock detailed AI breakdown!
                  </p>
                ) : (
                  <p style={{ margin: "4px 0 0", color: "#8f96ad", fontSize: 12 }}>
                    Click &quot;Reveal Explanation Note&quot; for a hint before making your selection.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Options Selector Column */}
          <div className={styles.optionsSection}>
            <label className={styles.optionsTitle}>Select Answer:</label>

            <div className={styles.optionsList}>
              {currentQuestion.options.map((opt, optIdx) => {
                const curQId = getQId(currentQuestion);
                const isSelected = userAnswers[curQId] === optIdx;
                const optionLetter = String.fromCharCode(65 + optIdx);

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(curQId, optIdx)}
                    className={`${styles.optionCard} ${
                      isSelected ? styles.optionCardActive : ""
                    }`}
                  >
                    <div className={styles.optionLetter}>{optionLetter}</div>
                    <div className={styles.optionText}>{opt}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className={styles.actionsBar}>
          <button
            type="button"
            onClick={() => handleJumpToQuestion(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="button button-small"
            style={{ background: "#12172b", borderColor: "#303854", color: "#c3c8dd" }}
          >
            ← Previous Question
          </button>

          {!isLastQuestion ? (
            <button
              type="button"
              onClick={() =>
                handleJumpToQuestion(
                  Math.min(totalQuestions - 1, currentIndex + 1),
                )
              }
              className="button button-small"
            >
              Next Question →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="button button-small"
              style={{ background: "#65dfad", color: "#0b1510", fontWeight: 700 }}
            >
              {isSubmitting ? "Submitting…" : "Submit Quiz Session ✓"}
            </button>
          )}
        </div>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
