"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../../_components/home/SiteHeader";
import { SiteFooter } from "../../_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader, PageLoader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { getInterviewSession, respondToInterview, type InterviewSession } from "@/lib/api/interview";
import styles from "../interview.module.css";

function InterviewRoomContent() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getInterviewSession(sessionId)
      .then((result) => {
        if (!cancelled) setSession(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Could not load this interview."));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [session?.messages.length]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || !session) return;
    setIsSending(true);
    setSendError(null);
    try {
      const updated = await respondToInterview(session.id, answer.trim());
      setSession(updated);
      setAnswer("");
    } catch (error) {
      setSendError(getErrorMessage(error, "Could not send your answer. Try again."));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <PageLoader label="Loading interview…" />;
  }

  if (loadError || !session) {
    return (
      <main className="section-shell">
        <div className={styles.notFoundPanel}>
          <p>{loadError ?? "This interview could not be found."}</p>
          <Link href="/interview">← Back to mock interviews</Link>
        </div>
      </main>
    );
  }

  // Candidate turns already answered, out of the session's configured
  // total — shown so the candidate always knows how far along they are,
  // not just that the interview is "in progress" with no visible length.
  const candidateTurns = session.messages.filter((m) => m.role === "candidate").length;
  const totalQuestions = session.totalQuestions ?? 5;
  const questionProgress = session.status === "completed" ? totalQuestions : Math.min(candidateTurns + 1, totalQuestions);

  return (
    <main className={styles.roomShell}>
      <div className={styles.roomHead}>
        <h1>{session.topic.replace(/-/g, " ")} interview</h1>
        <div className={styles.roomMeta}>
          <span>{session.difficulty}</span>
          <span>·</span>
          <span>
            {session.status === "completed" ? `${totalQuestions} questions answered` : `Question ${questionProgress} of ${totalQuestions}`}
          </span>
          <span>·</span>
          <span>{session.status === "completed" ? "Completed" : "In progress"}</span>
        </div>
      </div>

      <div className={styles.chatShell}>
        <div className={styles.messageList} ref={messageListRef}>
          {session.messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.messageRow} ${
                message.role === "interviewer" ? styles.messageRowInterviewer : styles.messageRowCandidate
              }`}
            >
              <div
                className={`${styles.bubble} ${
                  message.role === "interviewer" ? styles.bubbleInterviewer : styles.bubbleCandidate
                }`}
              >
                <span className={styles.bubbleLabel}>{message.role === "interviewer" ? "Interviewer" : "You"}</span>
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {isSending && (
          <div className={styles.thinkingRow}>
            <Loader label="Interviewer is thinking…" size="sm" />
          </div>
        )}

        {session.status === "in_progress" && (
          <form className={styles.composer} onSubmit={handleSend}>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer…"
              disabled={isSending}
            />
            {sendError && <p className={styles.formError}>{sendError}</p>}
            <div className={styles.composerActions}>
              <button type="submit" className="button button-small" disabled={isSending || !answer.trim()}>
                {isSending ? "Sending…" : "Send answer"} <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {session.status === "completed" && (
        <section className={styles.feedbackPanel}>
          <div className={styles.feedbackHead}>
            <h3>Interview feedback</h3>
            {typeof session.score === "number" && <span className={styles.feedbackScore}>{session.score}/10</span>}
          </div>
          <p className={styles.feedbackText}>{session.feedback}</p>
          <div className={styles.feedbackActions}>
            <Link href="/interview">Start another mock interview →</Link>
          </div>
        </section>
      )}
    </main>
  );
}

export default function InterviewSessionPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <InterviewRoomContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
