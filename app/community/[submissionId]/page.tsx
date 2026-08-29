"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  addCommunityComment,
  getCommunitySubmission,
  listCommunityComments,
} from "@/lib/api/community";
import type { CommunityComment, CommunitySubmissionDetail } from "@/lib/api/community";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { PageLoader, Loader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import styles from "../community.module.css";

const difficultyClass: Record<string, string> = {
  EASY: "pill-easy",
  MEDIUM: "pill-medium",
  HARD: "pill-hard",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString();
}

function AuthorAvatar({ author, large }: { author: { name: string; profilePicUrl?: string } | null; large?: boolean }) {
  const sizeClass = large ? styles.avatarLg : "";
  if (author?.profilePicUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`${styles.avatar} ${sizeClass}`.trim()} src={author.profilePicUrl} alt={`${author.name} avatar`} />;
  }
  return (
    <span className={`${styles.avatar} ${styles.avatarFallback} ${sizeClass}`.trim()}>
      {(author?.name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function CommentThread({ submissionId }: { submissionId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCommunityComments(submissionId)
      .then((result) => {
        if (!cancelled) {
          setComments(result);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadErrorMessage(getErrorMessage(error, "Could not load comments."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || isPosting) return;
    setIsPosting(true);
    setPostError(null);
    try {
      const comment = await addCommunityComment(submissionId, draft.trim());
      setComments((current) => [...current, comment]);
      setDraft("");
    } catch (error) {
      setPostError(error instanceof ApiError ? error.message : "Could not post your comment.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section className={styles.commentSection}>
      <h3>Discussion</h3>

      {status === "loading" && <Loader label="Loading comments…" />}
      {status === "error" && <p className="problem-list-status">{loadErrorMessage}</p>}

      {status === "ready" && (
        <div className={styles.commentList}>
          {comments.length === 0 && <p className={styles.commentEmpty}>No comments yet — start the discussion.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <AuthorAvatar author={comment.author} />
              <div className={styles.commentBody}>
                <div className={styles.commentHead}>
                  <span className={styles.commentAuthor}>{comment.author?.name ?? "Deleted user"}</span>
                  <span className={styles.commentTime}>{formatTimestamp(comment.createdAt)}</span>
                </div>
                <p className={styles.commentContent}>{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form className={styles.commentForm} onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share a thought about this solution…"
            maxLength={2000}
            disabled={isPosting}
          />
          <div className={styles.commentFormFoot}>
            {postError ? <p className={styles.commentFormError}>{postError}</p> : <span />}
            <button type="submit" className="button button-small" disabled={isPosting || !draft.trim()}>
              {isPosting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.signInPrompt}>
          <Link href="/signin">Sign in</Link> to join the discussion.
        </div>
      )}
    </section>
  );
}

export default function CommunitySubmissionPage() {
  const params = useParams<{ submissionId: string }>();
  const [submission, setSubmission] = useState<CommunitySubmissionDetail | null>(null);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getCommunitySubmission(params.submissionId)
      .then((data) => {
        if (cancelled) return;
        setSubmission(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.statusCode === 404) {
          setStatus("notfound");
        } else {
          setPageErrorMessage(getErrorMessage(error, "Could not load this submission."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.submissionId]);

  return (
    <ProtectedRoute>
      <SiteHeader />
      {status === "loading" && <PageLoader label="Loading submission…" />}

      {(status === "notfound" || status === "error") && (
        <main className="section-shell workspace">
          <p className="eyebrow">
            <b />
            COMMUNITY
          </p>
          <h1>Not found</h1>
          <p>
            {status === "notfound"
              ? "This submission isn't available in the community — it may not exist, or may not be an accepted solution."
              : pageErrorMessage}
          </p>
          <Link className="text-link" href="/community">
            ← Back to community
          </Link>
        </main>
      )}

      {status === "ready" && submission && (
        <main className="section-shell workspace">
          <p className="eyebrow">
            <b />
            COMMUNITY
          </p>
          <h1>{submission.problem?.title ?? "Deleted problem"}</h1>
          {submission.problem?.slug && (
            <Link className="text-link" href={`/problems/${submission.problem.slug}`}>
              View problem →
            </Link>
          )}

          <div className={styles.detailHead}>
            <div className={styles.detailAuthor}>
              <AuthorAvatar author={submission.author} large />
              <div>
                <div className={styles.authorName}>{submission.author?.name ?? "Deleted user"}</div>
                <div className={styles.commentTime}>submitted {formatTimestamp(submission.createdAt)}</div>
              </div>
            </div>
            <div className={styles.detailMeta}>
              <span>
                Verdict: <b>{submission.verdict}</b>
              </span>
              <span>Language: {submission.language}</span>
              <span>Runtime: {submission.runtimeMs} ms</span>
              <span>Score: {submission.score}</span>
              {submission.problem?.difficulty && (
                <span className={`pill ${difficultyClass[submission.problem.difficulty] ?? ""}`}>{submission.problem.difficulty}</span>
              )}
            </div>
          </div>

          <div className="output-panel" style={{ marginTop: 18 }}>
            <h4>Code</h4>
            <pre>{submission.code}</pre>
          </div>

          <CommentThread submissionId={submission.id} />

          <Link className="text-link" href="/community" style={{ marginTop: 32, display: "inline-flex" }}>
            ← Back to community
          </Link>
        </main>
      )}
      <SiteFooter />
    </ProtectedRoute>
  );
}
