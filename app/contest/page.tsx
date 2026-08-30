"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listContests } from "@/lib/api/contests";
import type { ContestSummary } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const statusLabel: Record<string, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Live now",
  ENDED: "Ended",
};

export default function ContestPage() {
  const [contests, setContests] = useState<ContestSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    listContests({ limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setContests(result.items);
        setStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load contests."));
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className="section-shell workspace">
      <p className="eyebrow">
        <b />
        CONTESTS
      </p>
      <h1>Live contests</h1>
      <p>Compete head-to-head against other solvers, ranked on a live scoreboard.</p>

      {status === "loading" && <Loader label="Loading contests…" />}
      {status === "error" && <p className="problem-list-status">{errorMessage}</p>}
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
      <SiteFooter />
    </ProtectedRoute>
  );
}
