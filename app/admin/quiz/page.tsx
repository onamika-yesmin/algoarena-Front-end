"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminShell } from "@/components/admin/AdminShell";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { useAuth } from "@/providers/AuthProvider";
import {
  getAdminPendingQuestions,
  reviewAdminQuestion,
  triggerAdminBatchGeneration,
  triggerAdminAutoFlag,
} from "@/lib/api/quiz";
import { getErrorMessage } from "@/lib/api/client";
import type {
  AdminPendingQuizQuestion,
  QuestionDifficulty,
  QuestionType,
  EditQuizQuestionData,
} from "@/types/quiz";
import styles from "@/app/quiz/quiz.module.css";

function AdminQuizModerationContent() {
  const { user } = useAuth();

  // Review Queue / Database List State
  const [questions, setQuestions] = useState<AdminPendingQuizQuestion[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Tab Status Breakdown Counts
  const [tabCounts, setTabCounts] = useState<{
    pending: number;
    approved: number;
    rejected: number;
    all: number;
  }>({ pending: 0, approved: 0, rejected: 0, all: 0 });

  // Filters State
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<QuestionDifficulty | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("pending_review");
  const [filterVerification, setFilterVerification] = useState<"ALL" | "FAILED" | "VERIFIED">("ALL");

  // Batch Generation Form State
  const [genTopic, setGenTopic] = useState<string>("arrays");
  const [genDifficulty, setGenDifficulty] = useState<QuestionDifficulty>("MEDIUM");
  const [genCount, setGenCount] = useState<number>(5);
  const [genType, setGenType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Notification Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isBatchApproving, setIsBatchApproving] = useState<boolean>(false);
  const [isRunningQC, setIsRunningQC] = useState<boolean>(false);

  // Edit Modal State
  const [editingQ, setEditingQ] = useState<AdminPendingQuizQuestion | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [editTopic, setEditTopic] = useState<string>("");
  const [editDifficulty, setEditDifficulty] = useState<QuestionDifficulty>("EASY");
  const [editOptions, setEditOptions] = useState<string[]>(["", "", "", ""]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<number>(0);
  const [editExplanation, setEditExplanation] = useState<string>("");
  const [editCode, setEditCode] = useState<string>("");
  const [editLanguage, setEditLanguage] = useState<string>("javascript");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch Questions (Pending, Approved, Rejected, or All)
  const fetchQuestions = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingQueue(true);
    setQueueError(null);
    try {
      const res = await getAdminPendingQuestions({
        page,
        limit: 10,
        topic: filterTopic.trim() || undefined,
        difficulty: filterDifficulty || undefined,
        status: filterStatus,
      });
      setQuestions(res.questions);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);

      if (res.statusCounts) {
        setTabCounts(res.statusCounts);
      }
    } catch (err) {
      setQueueError(getErrorMessage(err, "Failed to load database questions."));
    } finally {
      if (showLoading) setIsLoadingQueue(false);
    }
  }, [page, filterTopic, filterDifficulty, filterStatus]);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchQuestions();
    }
  }, [user?.role, fetchQuestions]);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Handle Quality Control Auto-Flag Audit
  const handleRunQCAudit = async () => {
    setIsRunningQC(true);
    try {
      const res = await triggerAdminAutoFlag();
      const totalFlagged = res.flaggedLowAccuracyCount + res.flaggedHighAccuracyCount;
      setToastMsg(
        `🔍 Quality Control Audit complete! Inspected ${res.inspectedCount} active questions. Flagged ${totalFlagged} outliers (${res.flaggedLowAccuracyCount} low accuracy, ${res.flaggedHighAccuracyCount} trivial) for review.`
      );
      void fetchQuestions(true);
    } catch (err) {
      setToastMsg(`QC Audit failed: ${getErrorMessage(err)}`);
    } finally {
      setIsRunningQC(false);
    }
  };

  // Handle Approve
  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await reviewAdminQuestion(id, "approve");
      setToastMsg("✓ Question approved and published to active quiz pool!");
      void fetchQuestions(false);
    } catch (err) {
      setToastMsg(`Error approving: ${getErrorMessage(err)}`);
    } finally {
      setActioningId(null);
    }
  };

  // Handle Batch Approve All Verified
  const handleApproveAllVerified = async () => {
    const verifiedQuestions = questions.filter((q) => q.verificationStatus === "verified" && q.status === "pending_review");
    if (verifiedQuestions.length === 0) {
      setToastMsg("No pending verified questions in current view to batch approve.");
      return;
    }

    setIsBatchApproving(true);
    try {
      await Promise.all(verifiedQuestions.map((q) => reviewAdminQuestion(q._id, "approve")));
      setToastMsg(`✓ Successfully approved ${verifiedQuestions.length} verified questions!`);
      void fetchQuestions(true);
    } catch (err) {
      setToastMsg(`Batch approve failed: ${getErrorMessage(err)}`);
    } finally {
      setIsBatchApproving(false);
    }
  };

  // Handle Reject
  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      await reviewAdminQuestion(id, "reject");
      setToastMsg("Question rejected and discarded.");
      void fetchQuestions(false);
    } catch (err) {
      setToastMsg(`Error rejecting: ${getErrorMessage(err)}`);
    } finally {
      setActioningId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (q: AdminPendingQuizQuestion) => {
    setEditingQ(q);
    setEditText(q.questionText);
    setEditTopic(q.topic);
    setEditDifficulty(q.difficulty);
    setEditOptions(q.options && q.options.length >= 2 ? [...q.options] : ["", "", "", ""]);
    
    const correctIdx = typeof q.correctAnswer === "number" ? q.correctAnswer : Number(q.correctAnswer ?? 0);
    setEditCorrectAnswer(isNaN(correctIdx) ? 0 : correctIdx);
    
    setEditExplanation(q.explanation || "");
    setEditCode(q.codeSnippet?.code || "");
    setEditLanguage(q.codeSnippet?.language || "javascript");
    setEditError(null);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingQ) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const updateData: EditQuizQuestionData = {
        questionText: editText.trim(),
        topic: editTopic.trim(),
        difficulty: editDifficulty,
        options: editOptions.map((o) => o.trim()),
        correctAnswer: editCorrectAnswer,
        explanation: editExplanation.trim(),
        codeSnippet: editCode.trim()
          ? { language: editLanguage.trim() || "code", code: editCode.trim() }
          : undefined,
      };

      await reviewAdminQuestion(editingQ._id, "edit", updateData);
      setToastMsg("✓ Question updated successfully!");
      setEditingQ(null);
      void fetchQuestions(false);
    } catch (err) {
      setEditError(getErrorMessage(err, "Failed to update question."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Trigger Batch Generation Form Submit with Polling
  const handleTriggerBatchGen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTopic.trim()) return;

    if (genCount > 15) {
      setToastMsg("⚠️ Limit Exceeded: Maximum 15 questions can be generated per batch request.");
      return;
    }

    setIsGenerating(true);
    setToastMsg(`⚡ Batch generation started for topic '${genTopic}' (${genCount} requested). AI pipeline & Judge0 verifying...`);

    try {
      await triggerAdminBatchGeneration({
        topic: genTopic.trim().toLowerCase(),
        difficulty: genDifficulty,
        count: Number(genCount) || 5,
        type: genType,
      });

      // Poll queue every 2 seconds for 10 seconds to pick up new questions
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        void fetchQuestions(false);
        if (pollCount >= 5) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setToastMsg("✓ Batch generation complete! Check pending queue below.");
        }
      }, 2000);

    } catch (err) {
      setToastMsg(`Failed to trigger generation: ${getErrorMessage(err)}`);
      setIsGenerating(false);
    }
  };

  // Filtered Queue Display
  const displayedQuestions = questions.filter((q) => {
    if (filterVerification === "FAILED") return q.verificationStatus === "failed";
    if (filterVerification === "VERIFIED") return q.verificationStatus === "verified";
    return true;
  });

  const verifiedInView = questions.filter((q) => q.verificationStatus === "verified" && q.status === "pending_review").length;

  return (
    <AdminRoute>
      <AdminShell
        eyebrow="ADMIN MODERATION"
        title="Quiz Bank & Batch Pipeline"
        description="Review AI-generated questions awaiting audit, browse approved quiz bank, execute inline edits, trigger background generation, and run quality control audits."
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={isRunningQC}
              onClick={handleRunQCAudit}
              className="button button-small"
              style={{ background: "#ffb254", color: "#1a1202", fontWeight: 700 }}
            >
              {isRunningQC ? "Auditing Analytics..." : "🔍 Run Quality Control Audit"}
            </button>
            {verifiedInView > 0 && filterStatus === "pending_review" && (
              <button
                type="button"
                disabled={isBatchApproving}
                onClick={handleApproveAllVerified}
                className="button button-small"
                style={{ background: "#65dfad", color: "#0b1510", fontWeight: 700 }}
              >
                {isBatchApproving ? "Approving..." : `✓ Approve ${verifiedInView} Verified`}
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchQuestions(true)}
              className="button button-small"
              style={{ background: "#12172b", borderColor: "#303854", color: "#55d8d2" }}
            >
              🔄 Refresh List
            </button>
          </div>
        }
      >
        {/* Global Toast Notification */}
        {toastMsg && <div className={styles.toastSuccess}>{toastMsg}</div>}

        {/* Database Status Tabs Bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("pending_review");
              setPage(1);
            }}
            className="button button-small"
            style={{
              background: filterStatus === "pending_review" ? "#8067ff" : "#0d1020",
              borderColor: filterStatus === "pending_review" ? "#8067ff" : "#262e4f",
              color: "#ffffff",
              fontWeight: 700,
            }}
          >
            ⏳ Pending Review ({tabCounts.pending})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("approved");
              setPage(1);
            }}
            className="button button-small"
            style={{
              background: filterStatus === "approved" ? "#65dfad" : "#0d1020",
              borderColor: filterStatus === "approved" ? "#65dfad" : "#262e4f",
              color: filterStatus === "approved" ? "#0b1510" : "#ffffff",
              fontWeight: 700,
            }}
          >
            ✓ Approved Quiz Pool ({tabCounts.approved})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("rejected");
              setPage(1);
            }}
            className="button button-small"
            style={{
              background: filterStatus === "rejected" ? "#ff8080" : "#0d1020",
              borderColor: filterStatus === "rejected" ? "#ff8080" : "#262e4f",
              color: filterStatus === "rejected" ? "#1a0505" : "#ffffff",
              fontWeight: 700,
            }}
          >
            ✗ Rejected Questions ({tabCounts.rejected})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("all");
              setPage(1);
            }}
            className="button button-small"
            style={{
              background: filterStatus === "all" ? "#55d8d2" : "#0d1020",
              borderColor: filterStatus === "all" ? "#55d8d2" : "#262e4f",
              color: filterStatus === "all" ? "#071c1b" : "#ffffff",
              fontWeight: 700,
            }}
          >
            🌐 All Database Questions ({tabCounts.all})
          </button>
        </div>

        {/* Main Admin Grid */}
        <div className={styles.adminGrid}>
          {/* Left Column: Batch Generation Trigger Form */}
          <aside className={styles.configPanel}>
            <h2 className={styles.sectionTitle} style={{ fontSize: 18 }}>
              ⚡ Trigger AI Batch Gen
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "#8f96ad", lineHeight: 1.5 }}>
              Generates questions asynchronously using Judge0 execution sandbox & secondary AI audit.
            </p>

            <form onSubmit={handleTriggerBatchGen} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
              {/* Topic Field */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Topic Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. arrays, dynamic_programming"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              {/* Difficulty Field */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Difficulty:</label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value as QuestionDifficulty)}
                  className={styles.inputField}
                >
                  <option value="EASY">🟢 EASY</option>
                  <option value="MEDIUM">🟡 MEDIUM</option>
                  <option value="HARD">🔴 HARD</option>
                </select>
              </div>

              {/* Question Count Field */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Count (1 - 15):</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className={styles.inputField}
                />
                <span style={{ fontSize: 11, color: "#8f96ad", marginTop: 2 }}>
                  ⚡ Limit: Max 15 questions per batch. Duplicates are auto-skipped.
                </span>
              </div>

              {/* Question Type Field */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Question Type:</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as QuestionType)}
                  className={styles.inputField}
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="OUTPUT_PREDICTION">Output Prediction</option>
                  <option value="COMPLEXITY">Complexity Analysis</option>
                  <option value="BUG_SPOTTING">Bug Spotting</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="button button-small"
                style={{ width: "100%", marginTop: 8, background: "#8067ff", fontWeight: 700 }}
              >
                {isGenerating ? "Processing in Background (Polling…)" : "Generate Batch (HTTP 202) →"}
              </button>
            </form>
          </aside>

          {/* Right Column: Questions List & Filters */}
          <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Filter & Pagination Bar */}
            <div className={styles.filterBar}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
                <span style={{ font: "700 13px DM Mono", color: "#ffffff" }}>
                  Current View ({totalCount}):
                </span>

                <input
                  type="text"
                  placeholder="Filter topic…"
                  value={filterTopic}
                  onChange={(e) => {
                    setFilterTopic(e.target.value);
                    setPage(1);
                  }}
                  className={styles.inputField}
                  style={{ width: 130, padding: "6px 10px", fontSize: 12 }}
                />

                <select
                  value={filterDifficulty}
                  onChange={(e) => {
                    setFilterDifficulty(e.target.value as QuestionDifficulty | "");
                    setPage(1);
                  }}
                  className={styles.inputField}
                  style={{ width: 120, padding: "6px 10px", fontSize: 12 }}
                >
                  <option value="">All Difficulties</option>
                  <option value="EASY">🟢 EASY</option>
                  <option value="MEDIUM">🟡 MEDIUM</option>
                  <option value="HARD">🔴 HARD</option>
                </select>

                <select
                  value={filterVerification}
                  onChange={(e) => setFilterVerification(e.target.value as "ALL" | "FAILED" | "VERIFIED")}
                  className={styles.inputField}
                  style={{ width: 140, padding: "6px 10px", fontSize: 12, borderColor: filterVerification === "FAILED" ? "#ff8080" : undefined }}
                >
                  <option value="ALL">All Audit Statuses</option>
                  <option value="FAILED">⚠ Flagged Mismatches</option>
                  <option value="VERIFIED">✓ Verified Clean</option>
                </select>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="button button-small"
                  style={{ padding: "4px 10px", fontSize: 12, background: "#0d1020", borderColor: "#262e4f" }}
                >
                  ← Prev
                </button>
                <span style={{ font: "11px DM Mono", color: "#8f96ad" }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="button button-small"
                  style={{ padding: "4px 10px", fontSize: 12, background: "#0d1020", borderColor: "#262e4f" }}
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {queueError && <div className={styles.errorMessage}>{queueError}</div>}

            {/* Queue Loading State */}
            {isLoadingQueue ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div className="aa-spinner" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
                <p className={styles.fieldLabel}>Loading Database Questions…</p>
              </div>
            ) : displayedQuestions.length === 0 ? (
              /* Empty State */
              <div className={styles.configPanel} style={{ textAlign: "center", padding: "48px 24px" }}>
                <h3 className={styles.sectionTitle} style={{ color: "#65dfad" }}>
                  🎉 No Questions Found!
                </h3>
                <p className={styles.lede} style={{ margin: "8px auto 0" }}>
                  No questions match your selected view ({filterStatus}) and filters.
                </p>
              </div>
            ) : (
              /* Questions List Cards */
              displayedQuestions.map((q) => {
                const isActioning = actioningId === q._id;

                return (
                  <div key={q._id} className={styles.questionCard}>
                    {/* Badge Header Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div className={styles.badgeRow}>
                        <span
                          className={`${styles.badgeTag} ${
                            q.difficulty === "EASY"
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
                        <span style={{ font: "700 11px DM Mono", color: "#55d8d2", textTransform: "uppercase" }}>
                          TOPIC: {q.topic}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span
                          className={styles.modePill}
                          style={{
                            background: q.status === "approved" ? "rgba(101, 223, 173, 0.2)" : q.status === "rejected" ? "rgba(255, 128, 128, 0.2)" : "rgba(255, 200, 97, 0.2)",
                            borderColor: q.status === "approved" ? "#65dfad" : q.status === "rejected" ? "#ff8080" : "#ffc861",
                            color: q.status === "approved" ? "#65dfad" : q.status === "rejected" ? "#ff8080" : "#ffc861",
                            fontWeight: 700,
                          }}
                        >
                          STATUS: {q.status.toUpperCase()}
                        </span>
                        <span
                          className={styles.modePill}
                          style={{
                            background: q.verificationStatus === "verified" ? "rgba(101, 223, 173, 0.15)" : "rgba(255, 128, 128, 0.15)",
                            borderColor: q.verificationStatus === "verified" ? "rgba(101, 223, 173, 0.35)" : "rgba(255, 128, 128, 0.35)",
                            color: q.verificationStatus === "verified" ? "#65dfad" : "#ff8080",
                          }}
                        >
                          {q.verificationStatus === "verified" ? "✓ Verified" : "⚠ Audit Warning"}
                        </span>
                      </div>
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

                    {/* Options List */}
                    <div className={styles.optionsList}>
                      {q.options.map((opt, optIdx) => {
                        const correctIdx = typeof q.correctAnswer === "number" ? q.correctAnswer : Number(q.correctAnswer ?? 0);
                        const isCorrect = correctIdx === optIdx;
                        const optionLetter = String.fromCharCode(65 + optIdx);

                        return (
                          <div
                            key={optIdx}
                            className={`${styles.optionCard} ${isCorrect ? styles.optionCorrect : ""}`}
                            style={{ cursor: "default" }}
                          >
                            <div className={styles.optionLetter}>{optionLetter}</div>
                            <div style={{ flex: 1 }}>
                              <div className={styles.optionText}>{opt}</div>
                              {isCorrect && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#65dfad", marginTop: 4, display: "inline-block" }}>
                                  ✓ Target Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Verification Notes */}
                    {q.verificationNotes && (
                      <div className={styles.insightBox} style={{ borderColor: "rgba(255, 200, 97, 0.3)", background: "rgba(255, 200, 97, 0.06)" }}>
                        <span style={{ color: "#ffc861", fontWeight: 700, fontFamily: "DM Mono", fontSize: 12 }}>
                          📝 Automated Verification Notes:
                        </span>
                        <p style={{ margin: "4px 0 0", color: "#d8d3ff", fontSize: 12.5 }}>
                          {q.verificationNotes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons Bar */}
                    <div className={styles.actionsBar} style={{ paddingTop: 14 }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        {q.status !== "approved" && (
                          <button
                            type="button"
                            disabled={isActioning}
                            onClick={() => handleApprove(q._id)}
                            className="button button-small"
                            style={{ background: "#65dfad", color: "#0b1510", fontWeight: 700 }}
                          >
                            ✓ Approve & Publish
                          </button>
                        )}
                        {q.status !== "rejected" && (
                          <button
                            type="button"
                            disabled={isActioning}
                            onClick={() => handleReject(q._id)}
                            className="button button-small"
                            style={{ background: "rgba(255, 128, 128, 0.15)", borderColor: "#ff8080", color: "#ff8080", fontWeight: 700 }}
                          >
                            ✗ Reject & Discard
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isActioning}
                        onClick={() => handleOpenEdit(q)}
                        className="button button-small"
                        style={{ background: "#12172b", borderColor: "#303854", color: "#55d8d2" }}
                      >
                        ✏️ Edit Question
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>

        {/* Edit Question Modal Overlay */}
        {editingQ && (
          <div className={styles.editModalOverlay} onClick={() => setEditingQ(null)}>
            <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                  ✏️ Edit Question Moderation
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingQ(null)}
                  style={{ background: "none", border: "none", color: "#8f96ad", fontSize: 20, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              {editError && <div className={styles.errorMessage}>{editError}</div>}

              {/* Topic & Difficulty */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Topic:</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Difficulty:</label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as QuestionDifficulty)}
                    className={styles.inputField}
                  >
                    <option value="EASY">🟢 EASY</option>
                    <option value="MEDIUM">🟡 MEDIUM</option>
                    <option value="HARD">🔴 HARD</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Question Text:</label>
                <textarea
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className={styles.inputField}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Options A, B, C, D */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Options (4 choices):</label>
                {editOptions.map((optVal, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ font: "700 12px DM Mono", color: "#55d8d2", width: 24 }}>
                      {String.fromCharCode(65 + idx)}:
                    </span>
                    <input
                      type="text"
                      value={optVal}
                      onChange={(e) => {
                        const updated = [...editOptions];
                        updated[idx] = e.target.value;
                        setEditOptions(updated);
                      }}
                      className={styles.inputField}
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer Selection */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Correct Answer Option:</label>
                <select
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(Number(e.target.value))}
                  className={styles.inputField}
                >
                  {editOptions.map((opt, idx) => (
                    <option key={idx} value={idx}>
                      Option {String.fromCharCode(65 + idx)}: {opt.slice(0, 40) || `Choice ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Explanation */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>AI Explanation:</label>
                <textarea
                  rows={3}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className={styles.inputField}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Code Snippet Code & Language */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Code Snippet (Optional):</label>
                <input
                  type="text"
                  placeholder="Language (e.g. javascript, python, cpp)"
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className={styles.inputField}
                  style={{ marginBottom: 6 }}
                />
                <textarea
                  rows={4}
                  placeholder="Code snippet block..."
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className={styles.inputField}
                  style={{ font: "13px DM Mono, monospace", resize: "vertical" }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingQ(null)}
                  className="button button-small"
                  style={{ background: "#12172b", borderColor: "#303854", color: "#c3c8dd" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                  className="button button-small"
                  style={{ background: "#65dfad", color: "#0b1510", fontWeight: 700 }}
                >
                  {isSavingEdit ? "Saving…" : "Save Changes ✓"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
      <SiteFooter />
    </AdminRoute>
  );
}

export default function AdminQuizModerationPage() {
  return <AdminQuizModerationContent />;
}
