"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listContests } from "@/lib/api/contests";
import type { ContestStatus, ContestSummary } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ContestCard, FeatureContest, sortContests } from "./contestViews";
import styles from "./contest.module.css";

/** Every countdown on the page ticks off this one interval. */
const TICK_MS = 1000;

type Filter = "ALL" | ContestStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ONGOING", label: "Live" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "ENDED", label: "Past" },
];

function HostCard({ role }: { role: string | undefined }) {
  if (role === "admin") {
    return (
      <div className={styles.hostCard}>
        <p>Schedule and manage every contest.</p>
        <Link className="text-link" href="/admin/contests">
          Contest manager <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }
  if (role === "guest") {
    return (
      <div className={styles.hostCard}>
        <p>You&apos;re an approved host.</p>
        <Link className="text-link" href="/admin/contests">
          Manage your contests <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }
  return (
    <div className={styles.hostCard}>
      <p>Want to run your own?</p>
      <Link className="text-link" href="/host">
        Host a contest <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function ContestContent() {
  const { user } = useAuth();
  const [contests, setContests] = useState<ContestSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  // Starts at 0 rather than Date.now() so the server and the first client
  // render agree; the effect below fills it in immediately on mount, long
  // before any countdown is on screen.
  const [now, setNow] = useState(0);

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

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(() => sortContests(contests), [contests]);
  const counts = useMemo(
    () => ({
      ALL: sorted.length,
      ONGOING: sorted.filter((c) => c.status === "ONGOING").length,
      UPCOMING: sorted.filter((c) => c.status === "UPCOMING").length,
      ENDED: sorted.filter((c) => c.status === "ENDED").length,
    }),
    [sorted],
  );

  // Feature whatever is worth acting on: a live contest, else the next one
  // to start. Nothing is featured when only past contests remain.
  const featured = sorted.find((c) => c.status === "ONGOING") ?? sorted.find((c) => c.status === "UPCOMING") ?? null;
  const visible = filter === "ALL" ? sorted : sorted.filter((c) => c.status === filter);

  return (
    <main className={`section-shell ${styles.page}`}>
      <div className={styles.head}>
        <div>
          <p className="eyebrow">
            <b />
            CONTESTS
          </p>
          <h1>Live contests</h1>
          <p className={styles.lede}>
            Register, solve the set before the clock runs out, and watch the scoreboard reorder itself while you work.
          </p>
        </div>
        {user && <HostCard role={user.role} />}
      </div>

      {status === "loading" && <Loader label="Loading contests…" />}
      {status === "error" && <p className={styles.error}>{errorMessage}</p>}

      {status === "ready" && sorted.length === 0 && (
        <div className={styles.empty}>
          <b>No contests scheduled yet</b>
          Nothing on the calendar right now. In the meantime, the problem library is always open — or host a round of
          your own.
        </div>
      )}

      {status === "ready" && sorted.length > 0 && (
        <>
          {featured && <FeatureContest contest={featured} now={now} />}

          <div className={styles.filters} role="group" aria-label="Filter contests">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                className={`${styles.filterButton}${filter === item.key ? ` ${styles.filterActive}` : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                <span className={styles.filterCount}>{counts[item.key]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className={styles.empty}>
              <b>Nothing here yet</b>
              No contests match that filter.
            </div>
          ) : (
            <div className={styles.grid}>
              {visible.map((contest) => (
                <ContestCard key={contest.id} contest={contest} now={now} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function ContestPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <ContestContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
