// Code Quest progress rules (pure, no React): which levels are unlocked,
// star and badge totals, merging server data with local results, and the
// small "not saved yet" queue that lets a failed save be retried later.

import { ALL_LEVELS, WORLDS, findLevelById, type LevelRef } from "./curriculum";
import type { World } from "./types";

export interface LevelProgress {
  /** Best stars earned, 1–3. */
  stars: number;
  /** ISO time of the first completion, when the server has recorded it. */
  completedAt?: string;
}

export type ProgressMap = Record<string, LevelProgress>;

export type LevelStatus = "locked" | "unlocked" | "completed";

/** Same rule the back end enforces on :levelId. */
export const LEVEL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toStars = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(3, Math.max(0, Math.round(value))) : 0;

const earliest = (a?: string, b?: string) => {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
};

/** Combines progress maps keeping the best stars and the earliest completion time per level. */
export function mergeProgress(...maps: ProgressMap[]): ProgressMap {
  const merged: ProgressMap = {};
  for (const map of maps) {
    for (const [levelId, entry] of Object.entries(map)) {
      const stars = toStars(entry?.stars);
      if (!stars) continue;
      const existing = merged[levelId];
      merged[levelId] = existing
        ? { stars: Math.max(existing.stars, stars), completedAt: earliest(existing.completedAt, entry.completedAt) }
        : { stars, completedAt: entry.completedAt };
    }
  }
  return merged;
}

export function progressFromServer(levels: readonly { levelId: string; stars: number; completedAt?: string }[] | undefined): ProgressMap {
  const entries: ProgressMap[] = [];
  for (const item of Array.isArray(levels) ? levels : []) {
    if (item && typeof item.levelId === "string") entries.push({ [item.levelId]: { stars: item.stars, completedAt: item.completedAt } });
  }
  return mergeProgress(...entries);
}

/** A level unlocks once the level before it (in the whole path) is completed — so a world unlocks when the previous world's last level is done. */
export function levelStatus(progress: ProgressMap, levelId: string): LevelStatus {
  if (progress[levelId]) return "completed";
  const ref = findLevelById(levelId);
  if (!ref) return "locked";
  if (ref.globalIndex === 0) return "unlocked";
  return progress[ALL_LEVELS[ref.globalIndex - 1].level.id] ? "unlocked" : "locked";
}

export const isWorldUnlocked = (progress: ProgressMap, world: World) => levelStatus(progress, world.levels[0].id) !== "locked";

export const isWorldComplete = (progress: ProgressMap, world: World) => world.levels.every((level) => Boolean(progress[level.id]));

export const worldStars = (progress: ProgressMap, world: World) => world.levels.reduce((sum, level) => sum + (progress[level.id]?.stars ?? 0), 0);

export const totalStars = (progress: ProgressMap) => ALL_LEVELS.reduce((sum, ref) => sum + (progress[ref.level.id]?.stars ?? 0), 0);

export const completedLevelCount = (progress: ProgressMap) => ALL_LEVELS.filter((ref) => progress[ref.level.id]).length;

export const earnedBadges = (progress: ProgressMap) => WORLDS.filter((world) => isWorldComplete(progress, world));

/** The first level not completed yet (always unlocked), or null when everything is done. */
export const nextLevelToPlay = (progress: ProgressMap): LevelRef | null => ALL_LEVELS.find((ref) => !progress[ref.level.id]) ?? null;

// ---------------------------------------------------------------------------
// Pending saves: completions the server hasn't confirmed yet. Kept per user in
// localStorage (with an in-memory fallback when storage is blocked) so they
// survive a reload and are retried on the next completion or page load.

export type PendingSaves = Record<string, number>;

const memoryPending = new Map<string, PendingSaves>();
const storageKey = (userKey: string) => `algoarena.kids.pendingProgress.${userKey}`;

const sanitizePending = (value: unknown): PendingSaves => {
  const clean: PendingSaves = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return clean;
  for (const [levelId, stars] of Object.entries(value as Record<string, unknown>)) {
    const safeStars = toStars(stars);
    if (safeStars && levelId.length <= 64 && LEVEL_ID_PATTERN.test(levelId)) clean[levelId] = safeStars;
  }
  return clean;
};

export function readPending(userKey: string): PendingSaves {
  const fromMemory = memoryPending.get(userKey) ?? {};
  let fromStorage: PendingSaves = {};
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey(userKey)) : null;
    if (raw) fromStorage = sanitizePending(JSON.parse(raw));
  } catch {
    // Storage blocked or corrupted — the in-memory copy still works for this visit.
  }
  const merged: PendingSaves = { ...fromStorage };
  for (const [levelId, stars] of Object.entries(fromMemory)) merged[levelId] = Math.max(merged[levelId] ?? 0, stars);
  return merged;
}

function writePending(userKey: string, pending: PendingSaves) {
  memoryPending.set(userKey, { ...pending });
  try {
    if (typeof window === "undefined") return;
    if (Object.keys(pending).length === 0) window.localStorage.removeItem(storageKey(userKey));
    else window.localStorage.setItem(storageKey(userKey), JSON.stringify(pending));
  } catch {
    // Ignore — see readPending.
  }
}

export function addPending(userKey: string, levelId: string, stars: number) {
  const pending = readPending(userKey);
  pending[levelId] = Math.max(pending[levelId] ?? 0, toStars(stars));
  writePending(userKey, pending);
}

/** Drops a pending save once the server holds at least that many stars. */
export function clearPending(userKey: string, levelId: string, savedStars: number) {
  const pending = readPending(userKey);
  if (pending[levelId] === undefined || pending[levelId] > savedStars) return;
  delete pending[levelId];
  writePending(userKey, pending);
}

export const pendingToProgress = (pending: PendingSaves): ProgressMap =>
  Object.fromEntries(Object.entries(pending).map(([levelId, stars]) => [levelId, { stars }]));
