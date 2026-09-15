"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { Mascot } from "./Mascot";
import { StarIcon } from "./StarRow";
import type { SaveResult } from "./useKidsProgress";
import ui from "./kidsUi.module.css";
import styles from "./Celebration.module.css";

const CONFETTI_COLORS = ["#ffc83d", "#ff7aa8", "#6ff7e8", "#8b5cf6", "#22c55e", "#2aa3e0", "#ff8c42"];

// Deterministic "random" layout so every render (and SSR) agrees.
const CONFETTI = Array.from({ length: 30 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  delay: `${((index * 53) % 90) / 100}s`,
  duration: `${2.1 + ((index * 29) % 12) / 10}s`,
  rotate: `${(index * 67) % 360}deg`,
  drift: `${((index * 41) % 80) - 40}px`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
}));

interface CelebrationProps {
  open: boolean;
  title: string;
  message: string;
  stars: number;
  tip?: string | null;
  badge?: { name: string; emoji: string } | null;
  saveState: "saving" | SaveResult;
  nextHref: string | null;
  nextLabel: string;
  onReplay: () => void;
  onClose: () => void;
}

export function Celebration({ open, title, message, stars, tip, badge, saveState, nextHref, nextLabel, onReplay, onClose }: CelebrationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      requestAnimationFrame(() => primaryRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="kids-celebration-title" onClose={onClose}>
      {open && (
        <div className={styles.confetti} aria-hidden="true">
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className={styles.piece}
              style={
                {
                  "--left": piece.left,
                  "--delay": piece.delay,
                  "--duration": piece.duration,
                  "--rotate": piece.rotate,
                  "--drift": piece.drift,
                  "--color": piece.color,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className={styles.inner}>
        <Mascot mood="cheer" size={112} className={styles.mascot} />
        <h2 id="kids-celebration-title" className={styles.title}>
          {title}
        </h2>
        <div className={styles.stars} role="img" aria-label={`${stars} out of 3 stars`}>
          {[0, 1, 2].map((index) => (
            <span key={index} className={styles.starSlot} style={{ animationDelay: `${0.2 + index * 0.22}s` }}>
              <StarIcon filled={index < stars} />
            </span>
          ))}
        </div>
        <p className={styles.message}>{message}</p>
        {tip && (
          <p className={styles.tip}>
            <span aria-hidden="true">💡 </span>
            {tip}
          </p>
        )}
        {badge && (
          <div className={styles.badge}>
            <span className={styles.badgeMedal} aria-hidden="true">
              {badge.emoji}
            </span>
            <div>
              <b>New badge!</b>
              <span>{badge.name}</span>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {nextHref ? (
            <Link ref={primaryRef} href={nextHref} className={`${ui.btn} ${ui.btnGo}`}>
              {nextLabel} <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link ref={primaryRef} href="/kids" className={`${ui.btn} ${ui.btnGo}`}>
              Back to the map <span aria-hidden="true">🗺️</span>
            </Link>
          )}
          <div className={styles.secondary}>
            <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={onReplay}>
              <span aria-hidden="true">↺</span> Play again
            </button>
            {nextHref && (
              <Link href="/kids" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`}>
                <span aria-hidden="true">🗺️</span> Map
              </Link>
            )}
          </div>
        </div>

        <p className={styles.save} role="status">
          {saveState === "saving" ? "Saving your stars…" : saveState === "saved" ? "✓ Stars saved!" : "Your stars will be saved next time you finish a level."}
        </p>
      </div>
    </dialog>
  );
}
