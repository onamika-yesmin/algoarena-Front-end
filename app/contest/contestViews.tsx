"use client";

import Link from "next/link";
import type { ContestSummary } from "@/types/api";
import styles from "./contest.module.css";

export const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Live now",
  ENDED: "Ended",
};

/** Re-rendered every second by the page, so all the "in 2h 14m" copy on
 *  screen moves together off a single timer rather than one per card. */
export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Compact relative wording: "2d 4h", "14m 03s", "just now". */
export function formatGap(ms: number) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLength(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (hours < 48) return `${hours} hr`;
  return `${Math.round(hours / 24)} days`;
}

/** Live, upcoming (soonest first), then ended (most recent first). */
export function sortContests(items: ContestSummary[]) {
  const weight = { ONGOING: 0, UPCOMING: 1, ENDED: 2 } as const;
  return [...items].sort((a, b) => {
    const byStatus = weight[a.status] - weight[b.status];
    if (byStatus !== 0) return byStatus;
    const at = new Date(a.startTime).getTime();
    const bt = new Date(b.startTime).getTime();
    return a.status === "ENDED" ? bt - at : at - bt;
  });
}

function Countdown({ ms }: { ms: number }) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const units: [string, number][] =
    days > 0
      ? [
          ["days", days],
          ["hrs", hours],
          ["min", minutes],
        ]
      : [
          ["hrs", hours],
          ["min", minutes],
          ["sec", seconds],
        ];
  return (
    <div className={styles.countdown}>
      {units.map(([label, value]) => (
        <span className={styles.countUnit} key={label}>
          <b>{String(value).padStart(2, "0")}</b>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * The one contest worth acting on right now — live if there is one,
 * otherwise whichever starts next — with a ticking countdown.
 */
export function FeatureContest({ contest, now }: { contest: ContestSummary; now: number }) {
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  const isLive = contest.status === "ONGOING";
  const target = isLive ? end : start;
  const elapsed = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));

  return (
    <section className={`${styles.feature}${isLive ? ` ${styles.featureLive}` : ""}`}>
      <span className={styles.featureGlow} aria-hidden="true" />
      <div>
        <p className={styles.featureKicker}>
          {isLive ? (
            <>
              <span className={styles.liveDot} /> Happening now
            </>
          ) : (
            <>Next up</>
          )}
        </p>
        <h2 className={styles.featureTitle}>{contest.title}</h2>
        {contest.description && <p className={styles.featureText}>{contest.description}</p>}
        <div className={styles.featureMeta}>
          <span>
            <b>{contest.problemCount}</b> problems
          </span>
          <span>
            runs <b>{formatLength(contest.startTime, contest.endTime)}</b>
          </span>
          <span>
            {isLive ? "ends" : "starts"} <b>{formatWhen(isLive ? contest.endTime : contest.startTime)}</b>
          </span>
        </div>
      </div>

      <div className={styles.countdownSide}>
        <span className={styles.countdownLabel}>{isLive ? "Ends in" : "Starts in"}</span>
        <Countdown ms={target - now} />
        {isLive && (
          <span className={styles.featureProgress} aria-hidden="true">
            <i style={{ width: `${elapsed * 100}%` }} />
          </span>
        )}
        <Link className="button button-small" href={`/contest/${contest.slug}`}>
          {isLive ? "Enter contest" : "View details"} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

export function ContestCard({ contest, now }: { contest: ContestSummary; now: number }) {
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  const isLive = contest.status === "ONGOING";
  const isUpcoming = contest.status === "UPCOMING";
  const elapsed = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  // Highlight an upcoming contest once it is within the hour.
  const startsSoon = isUpcoming && start - now < 3_600_000;

  const when = isLive
    ? `ends in ${formatGap(end - now)}`
    : isUpcoming
      ? `starts in ${formatGap(start - now)}`
      : `ended ${formatGap(now - end)} ago`;

  return (
    <Link
      href={`/contest/${contest.slug}`}
      className={`${styles.card}${isLive ? ` ${styles.cardLive}` : ""}`}
    >
      <div className={styles.cardTop}>
        <span className={`pill pill-contest-${contest.status.toLowerCase()} ${isLive ? styles.livePill : ""}`}>
          {isLive && <span className={styles.liveDot} aria-hidden="true" />}
          {STATUS_LABEL[contest.status] ?? contest.status}
        </span>
        <span
          className={`${styles.cardWhen}${isLive ? ` ${styles.cardWhenLive}` : startsSoon ? ` ${styles.cardWhenSoon}` : ""}`}
        >
          {when}
        </span>
      </div>

      <h3>{contest.title}</h3>
      {contest.description && <p className={styles.cardText}>{contest.description}</p>}

      {isLive && (
        <span className={styles.cardProgress} aria-hidden="true">
          <i style={{ width: `${elapsed * 100}%` }} />
        </span>
      )}

      <div className={styles.cardFoot}>
        <span>{contest.problemCount} problems</span>
        <span>{formatLength(contest.startTime, contest.endTime)}</span>
        <span className={styles.cardGo}>
          {isLive ? "Enter" : isUpcoming ? "Details" : "Results"} →
        </span>
      </div>
    </Link>
  );
}
