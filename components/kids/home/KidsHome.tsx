"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MAX_STARS, TOTAL_LEVELS, WORLDS, levelHref } from "@/lib/kids/curriculum";
import {
  completedLevelCount,
  earnedBadges,
  isWorldComplete,
  isWorldUnlocked,
  levelStatus,
  nextLevelToPlay,
  totalStars,
  worldStars,
} from "@/lib/kids/progress";
import { Mascot } from "../Mascot";
import { StarIcon, StarRow } from "../StarRow";
import { useKidsProgress } from "../useKidsProgress";
import ui from "../kidsUi.module.css";
import styles from "./KidsHome.module.css";

export function KidsHome() {
  const { progress, status, error, retry } = useKidsProgress();
  const ready = status !== "loading";
  const scrolledToHash = useRef(false);

  // Links like /kids#world-caves arrive before the map exists (it renders
  // after the sign-in check), so scroll to the target once it's on screen.
  useEffect(() => {
    if (!ready || scrolledToHash.current) return;
    scrolledToHash.current = true;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [ready]);

  const stars = totalStars(progress);
  const done = completedLevelCount(progress);
  const badges = earnedBadges(progress);
  const next = nextLevelToPlay(progress);
  const started = done > 0;

  const ctaHref = next ? levelHref(next.world.id, next.level.slug) : "#map";
  const ctaLabel = !next ? "Replay a level" : started ? "Continue your adventure" : "Start your adventure";
  const bubble = !ready
    ? "Hi, I'm Bolt! Let me find your stars…"
    : !started
      ? "Hi, I'm Bolt! Want to learn to code with me?"
      : next
        ? `${stars} stars already! Next up: ${next.level.title}.`
        : "You finished every level. You're a real coder!";

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="kq-hero-title">
        <div className={styles.heroText}>
          <p className={styles.kicker}>
            <span aria-hidden="true">✨</span> AlgoArena Kids · ages 8–14
          </p>
          <h1 id="kq-hero-title" className={styles.title}>
            Code <span>Quest</span>
          </h1>
          <p className={styles.lead}>Help Bolt the robot explore five worlds, from simple puzzles all the way to real Python code.</p>
          <div className={styles.heroActions}>
            <Link href={ctaHref} className={`${ui.btn} ${ui.btnPrimary} ${styles.cta}`}>
              {ctaLabel} <span aria-hidden="true">→</span>
            </Link>
            <a href="#map" className={`${ui.btn} ${ui.btnSoft}`}>
              <span aria-hidden="true">🗺️</span> See the map
            </a>
          </div>
        </div>
        <div className={styles.heroArt}>
          <p className={`${ui.bubble} ${ui.bubbleDown} ${styles.heroBubble}`}>{bubble}</p>
          <Mascot mood={started ? "cheer" : "happy"} size={230} title="Bolt the robot" className={styles.heroMascot} />
          <div className={styles.heroGround} aria-hidden="true" />
        </div>
      </section>

      <section aria-label="Your progress">
        <div className={styles.stats}>
          <div className={styles.stat}>
            <StarIcon filled className={styles.statStar} />
            <div>
              <b>
                {stars}
                <small> / {MAX_STARS}</small>
              </b>
              <span>stars</span>
            </div>
          </div>
          <div className={styles.stat}>
            <span className={styles.statEmoji} aria-hidden="true">
              🏁
            </span>
            <div>
              <b>
                {done}
                <small> / {TOTAL_LEVELS}</small>
              </b>
              <span>levels done</span>
            </div>
          </div>
          <div className={styles.stat}>
            <span className={styles.statEmoji} aria-hidden="true">
              🏅
            </span>
            <div>
              <b>
                {badges.length}
                <small> / {WORLDS.length}</small>
              </b>
              <span>badges</span>
            </div>
          </div>
        </div>
        <div className={styles.journey} role="progressbar" aria-label="Levels completed" aria-valuemin={0} aria-valuemax={TOTAL_LEVELS} aria-valuenow={done}>
          <span style={{ width: `${Math.round((done / TOTAL_LEVELS) * 100)}%` }} />
        </div>
      </section>

      {error && (
        <p className={ui.notice} role="alert">
          <span>Bolt couldn&apos;t load your saved stars right now.</span>
          <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={retry}>
            Try again
          </button>
        </p>
      )}

      <section id="map" className={styles.mapSection} aria-labelledby="kq-map-title">
        <div className={styles.sectionHead}>
          <h2 id="kq-map-title">Adventure map</h2>
          <p>Finish a level to unlock the next one. Finish a whole world to earn its badge!</p>
        </div>

        {!ready ? (
          <div className={styles.mapLoading} role="status">
            <Mascot mood="think" size={90} />
            <p>Finding your stars…</p>
          </div>
        ) : (
          <ol className={styles.worlds}>
            {WORLDS.map((world, worldIndex) => {
              const unlocked = isWorldUnlocked(progress, world);
              const complete = isWorldComplete(progress, world);
              return (
                <li key={world.id} id={`world-${world.id}`} className={`${styles.world} ${ui[`theme_${world.id}`]} ${unlocked ? "" : styles.worldLocked}`}>
                  <div className={styles.worldHead}>
                    <span className={styles.worldEmoji} aria-hidden="true">
                      {world.emoji}
                    </span>
                    <div className={styles.worldTitle}>
                      <p className={styles.worldKicker}>
                        World {world.number} · {world.concept}
                      </p>
                      <h3>{world.name}</h3>
                      <p className={styles.worldTagline}>{world.tagline}</p>
                    </div>
                    <div className={styles.worldMeta}>
                      <span className={styles.worldStars}>
                        <StarIcon filled />
                        <span>
                          {worldStars(progress, world)} / {world.levels.length * 3}
                          <span className={ui.srOnly}> stars</span>
                        </span>
                      </span>
                      {complete && (
                        <span className={styles.worldBadge}>
                          <span aria-hidden="true">{world.badge.emoji}</span> {world.badge.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {!unlocked && worldIndex > 0 && (
                    <p className={styles.lockNote}>
                      <span aria-hidden="true">🔒</span> Finish {WORLDS[worldIndex - 1].name} to unlock this world.
                    </p>
                  )}

                  <ol className={styles.path}>
                    {world.levels.map((level, index) => {
                      const state = levelStatus(progress, level.id);
                      const levelStars = progress[level.id]?.stars ?? 0;
                      const isNext = next?.level.id === level.id;
                      const nodeClass = `${styles.node} ${state === "completed" ? styles.nodeDone : state === "unlocked" ? styles.nodeOpen : styles.nodeLocked} ${isNext ? styles.nodeNext : ""}`;
                      return (
                        <li key={level.id} className={styles.stop}>
                          {state === "locked" ? (
                            <span className={nodeClass} aria-hidden="true">
                              🔒
                            </span>
                          ) : (
                            <Link
                              href={levelHref(world.id, level.slug)}
                              className={nodeClass}
                              aria-label={`Level ${index + 1}: ${level.title}. ${state === "completed" ? `${levelStars} of 3 stars.` : "Ready to play!"}`}
                            >
                              {index + 1}
                            </Link>
                          )}
                          <span className={styles.stopName}>
                            {level.title}
                            {state === "locked" && <span className={ui.srOnly}> (locked)</span>}
                          </span>
                          {state === "completed" ? (
                            <StarRow stars={levelStars} size="sm" />
                          ) : isNext ? (
                            <span className={styles.playTag} aria-hidden="true">
                              Play!
                            </span>
                          ) : (
                            <span className={styles.starSpacer} aria-hidden="true" />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="kq-badges-title">
        <div className={styles.sectionHead}>
          <h2 id="kq-badges-title">Badge shelf</h2>
          <p>Every world has its own badge. How many can you collect?</p>
        </div>
        <ul className={styles.badgeGrid}>
          {WORLDS.map((world) => {
            const earned = isWorldComplete(progress, world);
            return (
              <li key={world.id} className={`${styles.badge} ${ui[`theme_${world.id}`]} ${earned ? styles.badgeEarned : styles.badgeLocked}`}>
                <span className={styles.medal} aria-hidden="true">
                  {earned ? world.badge.emoji : "?"}
                </span>
                <b>{world.badge.name}</b>
                <span className={styles.badgeState}>{earned ? "Earned!" : `Finish ${world.name}`}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.parents} aria-labelledby="kq-parents-title">
        <div className={styles.sectionHead}>
          <h2 id="kq-parents-title">For parents &amp; teachers</h2>
          <p>Code Quest takes kids from their very first instruction to small Python programs, one idea at a time.</p>
        </div>
        <div className={styles.parentGrid}>
          {WORLDS.map((world) => (
            <article key={world.id} className={`${styles.parentCard} ${ui[`theme_${world.id}`]}`}>
              <p className={styles.worldKicker}>
                <span aria-hidden="true">{world.emoji}</span> World {world.number} · {world.concept}
              </p>
              <h3>{world.name}</h3>
              <p>{world.parents.summary}</p>
              <ul>
                {world.parents.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <ul className={styles.howList}>
          <li>
            <b>Small steps.</b> Each level teaches one idea, with hints ready whenever kids get stuck.
          </li>
          <li>
            <b>Stars reward thinking.</b> Every working solution counts. Shorter programs and fewer hints earn more stars.
          </li>
          <li>
            <b>Real code.</b> From World 4, kids&apos; programs run as real Python, and errors are explained in plain words.
          </li>
          <li>
            <b>Saved progress.</b> Stars and badges are saved to the signed-in AlgoArena account.
          </li>
        </ul>
      </section>
    </div>
  );
}
