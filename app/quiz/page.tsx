"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { startQuizSession } from "@/lib/api/quiz";
import { getErrorMessage } from "@/lib/api/client";
import type { QuestionDifficulty, SessionMode } from "@/types/quiz";
import styles from "./quiz.module.css";

interface QuizTopicOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

const TOPICS: QuizTopicOption[] = [
  {
    id: "arrays",
    name: "Arrays & Hashing",
    description: "Sliding window, two pointers, prefix sums, and hash tables.",
  },
  {
    id: "dp",
    name: "Dynamic Programming",
    description: "Memoization, tabulation, state transitions, and optimization.",
    badge: "Popular",
  },
  {
    id: "complexity",
    name: "Complexity Analysis",
    description: "Big-O notation, time & space bounds, and scaling tradeoffs.",
  },
  {
    id: "async-js",
    name: "Async JS & Promises",
    description: "Event loop, microtasks, async/await, and race conditions.",
  },
  {
    id: "trees",
    name: "Trees & Binary Trees",
    description: "BFS, DFS traversals, BST properties, and lowest common ancestor.",
  },
  {
    id: "graphs",
    name: "Graphs & Algorithms",
    description: "Dijkstra, Topological sort, Shortest path, and Disjoint Sets.",
  },
  {
    id: "sorting",
    name: "Sorting & Searching",
    description: "Binary search variations, QuickSort, MergeSort, and heaps.",
  },
  {
    id: "recursion",
    name: "Recursion & Backtracking",
    description: "N-Queens, permutations, subsets, and call stack management.",
  },
];

export default function QuizHubPage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<string>("arrays");
  const [selectedMode, setSelectedMode] = useState<SessionMode>("PRACTICE");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<QuestionDifficulty>("EASY");
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartQuiz = async () => {
    setIsStarting(true);
    setErrorMsg(null);
    try {
      const session = await startQuizSession({
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        mode: selectedMode,
        count: questionCount,
      });

      router.push(`/quiz/${session.sessionId}`);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to initialize quiz session."));
      setIsStarting(false);
    }
  };

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className={`section-shell ${styles.page}`}>
        {/* Header */}
        <section className={styles.head}>
          <p className="eyebrow">
            <b />
            AI QUIZ SYSTEM
          </p>
          <h1>Test Your Coding Mastery</h1>
          <p className={styles.lede}>
            Select a topic, choose your difficulty and game mode, and start solving
            AI-verified dynamic questions.
          </p>
        </section>

        {/* Setup Layout */}
        <div className={styles.setupGrid}>
          {/* Main Area: Topic Selection */}
          <div className={styles.topicsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>1. Select Topic</h2>
              <span className="eyebrow" style={{ margin: 0 }}>
                {TOPICS.length} TOPICS AVAILABLE
              </span>
            </div>

            <div className={styles.topicGrid}>
              {TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`${styles.topicCard} ${
                      isSelected ? styles.topicCardActive : ""
                    }`}
                  >
                    {topic.badge && (
                      <span className={styles.badgePopular}>{topic.badge}</span>
                    )}
                    <div className={styles.topicInner}>
                      <div className={styles.topicIcon}>
                        {topic.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className={styles.topicTitle}>{topic.name}</h3>
                        <p className={styles.topicDesc}>{topic.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Configurator */}
          <aside className={styles.configPanel}>
            {/* Mode Toggle */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>2. Quiz Mode</label>
              <div className={styles.modeToggleGrid}>
                <button
                  type="button"
                  onClick={() => setSelectedMode("PRACTICE")}
                  className={`${styles.modeButton} ${
                    selectedMode === "PRACTICE" ? styles.modeButtonActive : ""
                  }`}
                >
                  <div className={styles.modeTitle}>Practice</div>
                  <div className={styles.modeSub}>Instant Notes</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode("EXAM")}
                  className={`${styles.modeButton} ${
                    selectedMode === "EXAM" ? styles.modeButtonActive : ""
                  }`}
                >
                  <div className={styles.modeTitle}>Exam Mode</div>
                  <div className={styles.modeSub}>Timed & Gems</div>
                </button>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>3. Difficulty</label>
              <div className={styles.diffGrid}>
                {(["EASY", "MEDIUM", "HARD"] as QuestionDifficulty[]).map(
                  (diff) => {
                    const isSelected = selectedDifficulty === diff;
                    let diffClass = "";
                    if (isSelected) {
                      if (diff === "EASY") diffClass = styles.diffEasyActive;
                      if (diff === "MEDIUM") diffClass = styles.diffMediumActive;
                      if (diff === "HARD") diffClass = styles.diffHardActive;
                    }

                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`${styles.diffBtn} ${diffClass}`}
                      >
                        {diff}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Question Count */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>4. Questions</label>
              <div className={styles.countRow}>
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`${styles.countBtn} ${
                      questionCount === cnt ? styles.countBtnActive : ""
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

            {/* Submit Action */}
            <button
              type="button"
              onClick={handleStartQuiz}
              disabled={isStarting}
              className="button button-small"
              style={{ width: "100%", justifyContent: "center", padding: "14px" }}
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <span className="aa-spinner" style={{ width: 16, height: 16 }} />
                  Generating Quiz…
                </span>
              ) : (
                <span>Start Quiz Session →</span>
              )}
            </button>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
