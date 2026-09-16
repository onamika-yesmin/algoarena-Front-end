"use client";

import Link from "next/link";
import { useState } from "react";
import { findLevel, levelHref, nextLevel, previousLevel } from "@/lib/kids/curriculum";
import { isWorldComplete, levelStatus, nextLevelToPlay } from "@/lib/kids/progress";
import { Celebration } from "./Celebration";
import { Mascot, type MascotMood } from "./Mascot";
import { PuzzleLevel } from "./puzzle/PuzzleLevel";
import { PythonLevel } from "./python/PythonLevel";
import { StarRow } from "./StarRow";
import { useKidsProgress, type SaveResult } from "./useKidsProgress";
import ui from "./kidsUi.module.css";
import styles from "./LevelScreen.module.css";

interface CelebrationState {
  stars: 1 | 2 | 3;
  previousBest: number;
  badge: { name: string; emoji: string } | null;
  saveState: "saving" | SaveResult;
}

function MessageCard({ mood, title, children }: { mood: MascotMood; title: string; children: React.ReactNode }) {
  return (
    <section className={`${ui.card} ${styles.messageCard}`}>
      <Mascot mood={mood} size={120} />
      <h1>{title}</h1>
      {children}
    </section>
  );
}

export function LevelScreen({ worldId, levelSlug }: { worldId: string; levelSlug: string }) {
  const ref = findLevel(worldId, levelSlug);
  const { progress, status, error, recordCompletion, retry } = useKidsProgress();
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [replayToken, setReplayToken] = useState(0);

  if (!ref) {
    return (
      <MessageCard mood="oops" title="Hmm, that level doesn't exist">
        <p>Bolt looked everywhere but couldn&apos;t find it.</p>
        <Link href="/kids" className={`${ui.btn} ${ui.btnPrimary}`}>
          Back to the map
        </Link>
      </MessageCard>
    );
  }

  if (status === "loading") {
    return (
      <div className={styles.loading} role="status">
        <Mascot mood="think" size={110} />
        <p>Loading your adventure…</p>
      </div>
    );
  }

  const { world, level, indexInWorld } = ref;
  const state = levelStatus(progress, level.id);
  const previous = previousLevel(ref);
  const next = nextLevel(ref);

  if (state === "locked") {
    const playable = nextLevelToPlay(progress);
    return (
      <MessageCard mood="think" title={status === "error" ? "We couldn't load your stars" : "This level is still locked"}>
        {status === "error" ? (
          <p>Bolt couldn&apos;t check which levels you&apos;ve finished. {error}</p>
        ) : (
          <p>{previous ? `Finish “${previous.level.title}” first to unlock it.` : "Finish the level before it first."}</p>
        )}
        <div className={styles.messageActions}>
          {status === "error" ? (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={retry}>
              Try again
            </button>
          ) : (
            playable && (
              <Link href={levelHref(playable.world.id, playable.level.slug)} className={`${ui.btn} ${ui.btnPrimary}`}>
                Play “{playable.level.title}”
              </Link>
            )
          )}
          <Link href="/kids" className={`${ui.btn} ${ui.btnSoft}`}>
            Back to the map
          </Link>
        </div>
      </MessageCard>
    );
  }

  const nextUnlocked = next ? levelStatus(progress, next.level.id) !== "locked" : false;
  const best = progress[level.id]?.stars ?? 0;

  const handleSolved = (stars: 1 | 2 | 3) => {
    const worldDoneBefore = isWorldComplete(progress, world);
    const worldDoneNow = world.levels.every((item) => item.id === level.id || Boolean(progress[item.id]));
    setCelebration({ stars, previousBest: best, badge: !worldDoneBefore && worldDoneNow ? world.badge : null, saveState: "saving" });
    void recordCompletion(level.id, stars).then((saveState) => setCelebration((current) => (current ? { ...current, saveState } : current)));
  };

  const celebrationMessage = (() => {
    if (!celebration) return "";
    const earned = `You earned ${celebration.stars} star${celebration.stars === 1 ? "" : "s"}!`;
    if (celebration.previousBest && celebration.stars > celebration.previousBest) return `${earned} That's a new best!`;
    if (celebration.previousBest > celebration.stars) return `${earned} Your best is still ${celebration.previousBest} stars.`;
    return earned;
  })();

  const celebrationTip =
    celebration && celebration.stars < 3
      ? level.kind === "puzzle"
        ? `Use ${level.optimalBlocks} blocks or fewer to get 3 stars.`
        : "Solve it in 1 or 2 tries without hints to get 3 stars."
      : null;

  return (
    <div className={`${ui[`theme_${world.id}`]} ${styles.screen}`}>
      <nav className={styles.topBar} aria-label="Level navigation">
        <Link href={`/kids#world-${world.id}`} className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`}>
          <span aria-hidden="true">🗺️</span> Map
        </Link>
        <p className={styles.crumb}>
          <span className={ui.chip}>
            <span aria-hidden="true">{world.emoji}</span> World {world.number} · {world.name}
          </span>
          <span className={styles.levelCount}>
            Level {indexInWorld + 1} of {world.levels.length}
          </span>
        </p>
        <div className={styles.prevNext}>
          {previous ? (
            <Link
              href={levelHref(previous.world.id, previous.level.slug)}
              className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall} ${ui.btnIcon}`}
              aria-label={`Previous level: ${previous.level.title}`}
            >
              <span aria-hidden="true">←</span>
            </Link>
          ) : (
            <span className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall} ${ui.btnIcon}`} aria-hidden="true" data-disabled="true" style={{ visibility: "hidden" }}>
              ←
            </span>
          )}
          {next &&
            (nextUnlocked ? (
              <Link
                href={levelHref(next.world.id, next.level.slug)}
                className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall} ${ui.btnIcon}`}
                aria-label={`Next level: ${next.level.title}`}
              >
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall} ${ui.btnIcon}`} aria-disabled="true" title="Finish this level to unlock the next one">
                <span aria-hidden="true">🔒</span>
                <span className={ui.srOnly}>Next level is locked until you finish this one</span>
              </span>
            ))}
        </div>
      </nav>

      <header className={styles.header}>
        <Mascot mood="happy" size={96} className={styles.headerMascot} />
        <div className={styles.headerText}>
          <h1>{level.title}</h1>
          <p className={ui.bubble}>{level.story}</p>
        </div>
        {best > 0 && (
          <div className={styles.best}>
            <span>Your best</span>
            <StarRow stars={best} />
          </div>
        )}
      </header>

      {error && (
        <p className={ui.notice} role="alert">
          <span>Bolt couldn&apos;t refresh your saved stars. You can keep playing!</span>
          <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={retry}>
            Try again
          </button>
        </p>
      )}

      {level.kind === "puzzle" ? (
        <PuzzleLevel key={level.id} level={level} world={world} onSolved={handleSolved} replayToken={replayToken} />
      ) : (
        <PythonLevel key={level.id} level={level} onSolved={handleSolved} />
      )}

      <Celebration
        open={celebration !== null}
        title={!next ? "You finished Code Quest!" : celebration?.stars === 3 ? "Amazing!" : "Level complete!"}
        message={celebrationMessage}
        stars={celebration?.stars ?? 0}
        tip={celebrationTip}
        badge={celebration?.badge ?? null}
        saveState={celebration?.saveState ?? "saving"}
        nextHref={next ? levelHref(next.world.id, next.level.slug) : null}
        nextLabel={next && next.world.id !== world.id ? `On to ${next.world.name}` : "Next level"}
        onReplay={() => {
          setCelebration(null);
          setReplayToken((token) => token + 1);
        }}
        onClose={() => setCelebration(null)}
      />
    </div>
  );
}
