"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getGlobalLeaderboard, getMyRank } from "@/lib/api/leaderboard";
import type { LeaderboardEntry, MyRank } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";

const PAGE_SIZE = 25;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [myRank, setMyRank] = useState<MyRank | null>(null);

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
    getMyRank()
      .then(setMyRank)
      .catch(() => setMyRank(null));
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SiteHeader />
      <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        LEADERBOARD
      </p>
      <h1>Global rankings</h1>
      <p>Ranked by total score — the best-scoring accepted submission per problem, summed across every solved problem.</p>

      {user && myRank && (
        <div className="output-panel" style={{ marginTop: 18 }}>
          {myRank.rank ? (
            <p>
              Your rank: <b>#{myRank.rank}</b> of {myRank.totalRanked} · {myRank.problemsSolved} solved · {myRank.totalScore} points
            </p>
          ) : (
            <p>Solve a problem to appear on the leaderboard.</p>
          )}
        </div>
      )}

      {status === "loading" && <Loader label="Loading leaderboard…" />}
      {status === "error" && <p className="problem-list-status">{errorMessage}</p>}
      {status === "ready" && entries.length === 0 && <p className="problem-list-status">No ranked solvers yet — be the first to solve a problem.</p>}

      {status === "ready" && entries.length > 0 && (
        <div className="submission-history" style={{ marginTop: 24 }}>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Solver</th>
                <th>Solved</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.userId} style={user && entry.userId === (user.id ?? user._id) ? { fontWeight: 700 } : undefined}>
                  <td>#{entry.rank}</td>
                  <td>{entry.name}</td>
                  <td>{entry.problemsSolved}</td>
                  <td>{entry.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="problem-pagination" style={{ marginTop: 18 }}>
          <button type="button" className="button button-small" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            ← Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" className="button button-small" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next →
          </button>
        </div>
      )}
      </main>
      <SiteFooter />
    </>
  );
}
