"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listContests } from "@/lib/api/contests";
import type { ContestSummary } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import styles from "./contest.module.css";

const statusLabel: Record<string, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Live now",
  ENDED: "Ended",
};

export default function ContestPage() {
  const { user } = useAuth();
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

      {user && (
        <div className={styles.cta}>
          {user.role === "admin" ? (
            <>
              <p className={styles.ctaText}>Schedule contests and manage every contest on the platform.</p>
              <Link className="text-link" href="/admin/contests">
                Open the contest manager <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : user.role === "guest" ? (
            <>
              <p className={styles.ctaText}>You&apos;re an approved contest host.</p>
              <Link className="text-link" href="/admin/contests">
                Manage your contests <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <p className={styles.ctaText}>Want to run your own contest?</p>
              <Link className="text-link" href="/host">
                Host a contest <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      )}

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
