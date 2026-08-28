"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCommunityFeed } from "@/lib/api/community";
import type { CommunityFeedItem } from "@/lib/api/community";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import styles from "./community.module.css";

const PAGE_SIZE = 20;

const difficultyClass: Record<string, string> = {
  EASY: "pill-easy",
  MEDIUM: "pill-medium",
  HARD: "pill-hard",
};

function formatSubmittedAt(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function AuthorAvatar({ author, size = "sm" }: { author: { name: string; profilePicUrl?: string } | null; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? styles.avatarLg : "";
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

export default function CommunityPage() {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getCommunityFeed({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load the community feed."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SiteHeader />
      <main className="section-shell workspace">
        <p className="eyebrow">
          <b />
          COMMUNITY
        </p>
        <h1>Accepted solutions</h1>
        <p>Every accepted submission from every solver, in one public feed — browse approaches, and discuss them.</p>

        {status === "loading" && <Loader label="Loading community feed…" />}
        {status === "error" && <p className="problem-list-status">{errorMessage}</p>}

        {status === "ready" && items.length === 0 && (
          <div className={styles.emptyState}>
            <p>
              No accepted solutions yet — <Link href="/problems">be the first to solve a problem</Link>.
            </p>
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <div className={styles.feedGrid}>
            {items.map((item) => (
              <Link key={item.id} href={`/community/${item.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3 className={styles.cardTitle}>{item.problem?.title ?? "Deleted problem"}</h3>
                  {item.problem?.difficulty && (
                    <span className={`pill ${difficultyClass[item.problem.difficulty] ?? ""}`}>{item.problem.difficulty}</span>
                  )}
                </div>

                <div className={styles.authorRow}>
                  <AuthorAvatar author={item.author} />
                  <span className={styles.authorName}>{item.author?.name ?? "Deleted user"}</span>
                </div>

                <div className={styles.cardMeta}>
                  <span>{item.language}</span>
                  <span>{item.runtimeMs} ms</span>
                  <span>
                    {item.commentCount} comment{item.commentCount === 1 ? "" : "s"}
                  </span>
                  <span>{formatSubmittedAt(item.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {status === "ready" && totalPages > 1 && (
          <div className="problem-pagination" style={{ marginTop: 32 }}>
            <button type="button" className="button button-small" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              ← Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="button button-small"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
