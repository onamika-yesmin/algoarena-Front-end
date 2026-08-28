"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listContests } from "@/lib/api/contests";
import type { ContestSummary } from "@/types/api";

const statusLabel: Record<string, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Live now",
  ENDED: "Ended",
};

export default function ContestPage() {
  const [contests, setContests] = useState<ContestSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    listContests({ limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setContests(result.items);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        CONTESTS
      </p>
      <h1>Live contests</h1>
      <p>Compete head-to-head against other solvers, ranked on a live scoreboard.</p>

      {status === "loading" && <p className="problem-list-status">Loading contests…</p>}
      {status === "error" && <p className="problem-list-status">Could not load contests.</p>}
      {status === "ready" && contests.length === 0 && <p className="problem-list-status">No contests are scheduled yet — check back soon.</p>}

      {status === "ready" && contests.length > 0 && (
        <div className="problem-grid" style={{ marginTop: 24 }}>
          {contests.map((contest) => (
            <Link key={contest.id} href={`/contest/${contest.slug}`} className="problem-card">
              <div className="problem-card-top">
                <span className={`pill pill-contest-${contest.status.toLowerCase()}`}>{statusLabel[contest.status] ?? contest.status}</span>
              </div>
              <h3>{contest.title}</h3>
              <p className="contest-card-description">{contest.description}</p>
              <div className="problem-card-foot">
                <span>{contest.problemCount} problems</span>
                <span>{new Date(contest.startTime).toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
