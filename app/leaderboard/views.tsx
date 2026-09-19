"use client";

import type { CurrentUser, LeaderboardEntry, MyRank } from "@/types/api";
import { CountUp } from "@/components/ui/CountUp";
import styles from "./leaderboard.module.css";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Avatar for a solver. Falls back to their initial on a gradient when there
 * is no picture. A plain <img> rather than next/image on purpose: a
 * profilePicUrl can come from any host a user signed up through, and
 * next/image throws at render time on a host that isn't in remotePatterns.
 */
export function Avatar({ name, src, className }: { name: string; src?: string; className: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={src} alt="" aria-hidden="true" />;
  }
  return (
    <span className={`${className} ${styles.avatarFallback}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PodiumCard({ entry, place, isMe }: { entry: LeaderboardEntry; place: 1 | 2 | 3; isMe: boolean }) {
  const placeClass = place === 1 ? styles.place1 : place === 2 ? styles.place2 : styles.place3;
  return (
    <article className={`${styles.podiumCard} ${placeClass}`}>
      <span className={styles.medal} aria-hidden="true">
        {MEDALS[place - 1]}
      </span>
      <span className={styles.podiumAvatarWrap}>
        <Avatar name={entry.name} src={entry.profilePicUrl} className={styles.podiumAvatar} />
      </span>
      <p className={styles.podiumName}>
        {entry.name}
        {isMe && <span className={styles.youTag}>You</span>}
      </p>
      <span className={styles.podiumMeta}>#{entry.rank} overall</span>
      <strong className={styles.podiumScore}>
        <CountUp value={entry.totalScore} />
      </strong>
      <span className={styles.podiumMeta}>
        points · {entry.problemsSolved} solved
      </span>
    </article>
  );
}

export function LeaderboardBoard({
  entries,
  topScore,
  myId,
  rowRef,
}: {
  entries: LeaderboardEntry[];
  topScore: number;
  myId?: string;
  rowRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={styles.board}>
      <div className={styles.boardHead}>
        <span>Rank</span>
        <span>Solver</span>
        <span className={styles.solvedCol}>Solved</span>
        <span style={{ textAlign: "right" }}>Score</span>
      </div>
      {entries.map((entry, index) => {
        const isMe = Boolean(myId) && entry.userId === myId;
        const rankClass =
          entry.rank === 1 ? styles.rankTop1 : entry.rank === 2 ? styles.rankTop2 : entry.rank === 3 ? styles.rankTop3 : "";
        return (
          <div
            key={entry.userId}
            ref={isMe ? rowRef : undefined}
            className={`${styles.row}${isMe ? ` ${styles.rowMe}` : ""}`}
          >
            <span className={`${styles.rank} ${rankClass}`}>#{entry.rank}</span>
            <span className={styles.solver}>
              <Avatar name={entry.name} src={entry.profilePicUrl} className={styles.avatar} />
              <span className={styles.name}>
                {entry.name}
                {isMe && <span className={styles.youTag}>You</span>}
              </span>
            </span>
            <span className={styles.solved}>{entry.problemsSolved}</span>
            <span className={styles.scoreCell}>
              <span className={styles.scoreValue}>{entry.totalScore.toLocaleString("en-US")}</span>
              <span className={styles.scoreBar}>
                <i
                  style={{
                    width: `${topScore > 0 ? Math.max(4, (entry.totalScore / topScore) * 100) : 0}%`,
                    animationDelay: `${Math.min(index, 12) * 45}ms`,
                  }}
                />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function YourRankCard({
  user,
  myRank,
  entries,
}: {
  user: CurrentUser;
  myRank: MyRank;
  entries: LeaderboardEntry[];
}) {
  // When the solver above you happens to be on the page that's loaded, show
  // exactly how many points separate you — a concrete next target beats an
  // abstract rank number.
  const ahead = myRank.rank && myRank.rank > 1 ? entries.find((entry) => entry.rank === myRank.rank! - 1) : undefined;
  const gap = ahead ? ahead.totalScore - myRank.totalScore : null;

  return (
    <section className={styles.youCard} aria-label="Your ranking">
      <Avatar name={user.name} src={user.profilePicUrl} className={styles.youAvatar} />
      <div>
        <span className={styles.youLabel}>Your standing</span>
        <p className={styles.youName}>{user.name}</p>
      </div>
      <div className={styles.youStats}>
        <div>
          <b>{myRank.rank ? `#${myRank.rank}` : "—"}</b>
          <span>of {myRank.totalRanked}</span>
        </div>
        <div>
          <b>{myRank.problemsSolved}</b>
          <span>solved</span>
        </div>
        <div>
          <b>{myRank.totalScore.toLocaleString("en-US")}</b>
          <span>points</span>
        </div>
      </div>
      {myRank.rank === null ? (
        <p className={styles.youGap}>Solve a problem to claim a place on the board.</p>
      ) : myRank.rank === 1 ? (
        <p className={styles.youGap}>
          You are <b>top of the arena</b>. Keep solving to hold it.
        </p>
      ) : gap !== null ? (
        <p className={styles.youGap}>
          <b>{gap.toLocaleString("en-US")} points</b> behind #{myRank.rank - 1} — one more solve could close it.
        </p>
      ) : null}
    </section>
  );
}
