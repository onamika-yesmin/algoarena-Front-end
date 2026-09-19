"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getGlobalLeaderboard, getMyRank } from "@/lib/api/leaderboard";
import type { LeaderboardEntry, MyRank } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LeaderboardBoard, PodiumCard, YourRankCard } from "./views";
import styles from "./leaderboard.module.css";

const PAGE_SIZE = 25;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const myRowRef = useRef<HTMLDivElement | null>(null);
  const podiumRef = useRef<HTMLDivElement | null>(null);
  const scrollToMe = useRef(false);

  const myId = user?.id ?? user?._id;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getGlobalLeaderboard({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load the leaderboard."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    if (!user) {
      setMyRank(null);
      return;
    }
    let cancelled = false;
    getMyRank()
      .then((rank) => {
        if (!cancelled) setMyRank(rank);
      })
      .catch(() => {
        if (!cancelled) setMyRank(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // "Jump to my rank" may need a different page first; scroll only once the
  // row it asked for has actually rendered. Ranks 1–3 are on the podium, not
  // in the board, so that's the element to scroll to for them.
  useEffect(() => {
    if (status !== "ready" || !scrollToMe.current) return;
    scrollToMe.current = false;
    const target = myRowRef.current ?? podiumRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [status, entries]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const myPage = myRank?.rank ? Math.ceil(myRank.rank / PAGE_SIZE) : null;
  const topScore = useMemo(() => entries.reduce((max, entry) => Math.max(max, entry.totalScore), 0), [entries]);

  // The podium only makes sense on the first page, where ranks 1–3 live.
  const podium = page === 1 ? entries.slice(0, 3) : [];
  const rest = page === 1 ? entries.slice(3) : entries;

  const jumpToMe = () => {
    if (!myPage) return;
    if (myPage !== page) {
      scrollToMe.current = true;
      setPage(myPage);
    } else {
      (myRowRef.current ?? podiumRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className={`section-shell ${styles.page}`}>
        <div className={styles.head}>
          <div>
            <p className="eyebrow">
              <b />
              LEADERBOARD
            </p>
            <h1>Global rankings</h1>
          </div>
          {myPage && (
            <button type="button" className={`button-outline button-small ${styles.jumpButton}`} onClick={jumpToMe}>
              Jump to my rank <span aria-hidden="true">↓</span>
            </button>
          )}
        </div>
        <p className={styles.lede}>
          Ranked by total score — the best-scoring accepted submission per problem, summed across every problem you have
          solved.
        </p>

        {status === "loading" && <Loader label="Loading leaderboard…" />}
        {status === "error" && <p className={styles.state}>{errorMessage}</p>}

        {status === "ready" && (
          <>
            {podium.length > 0 && (
              <div className={`${styles.podium}${podium.length < 3 ? ` ${styles.podiumFew}` : ""}`} ref={podiumRef}>
                {/* Source order 2 · 1 · 3 so the winner sits raised in the
                    middle on desktop; CSS reorders it on narrow screens. */}
                {podium[1] && <PodiumCard entry={podium[1]} place={2} isMe={podium[1].userId === myId} />}
                {podium[0] && <PodiumCard entry={podium[0]} place={1} isMe={podium[0].userId === myId} />}
                {podium[2] && <PodiumCard entry={podium[2]} place={3} isMe={podium[2].userId === myId} />}
              </div>
            )}

            {user && myRank && <YourRankCard user={user} myRank={myRank} entries={entries} />}

            {entries.length === 0 ? (
              <div className={styles.board}>
                <p className={styles.state}>No ranked solvers yet — be the first to solve a problem.</p>
              </div>
            ) : rest.length > 0 ? (
              <LeaderboardBoard entries={rest} topScore={topScore} myId={myId} rowRef={myRowRef} />
            ) : null}

            {totalPages > 1 && (
              <div className={styles.pager}>
                <button
                  type="button"
                  className="button-outline button-small"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  ← Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="button-outline button-small"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
