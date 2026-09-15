"use client";

// Loads and saves Code Quest progress for the signed-in learner.
//
// Completions update the UI immediately and go into a small per-user
// "pending" queue (lib/kids/progress.ts) before being sent. A failed save
// stays queued and is retried on the next completion or the next page load,
// so a flaky connection never blocks a kid from moving on.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import { getKidsProgress, saveKidsProgress } from "@/lib/api/kids";
import {
  addPending,
  clearPending,
  mergeProgress,
  pendingToProgress,
  progressFromServer,
  readPending,
  type ProgressMap,
} from "@/lib/kids/progress";

export type ProgressLoadStatus = "loading" | "ready" | "error";
export type SaveResult = "saved" | "pending";

// Last known progress, shared across pages so going from the map to a level
// (or level to level) doesn't flash a loader. Refreshed in the background.
let cache: { userKey: string; progress: ProgressMap; loaded: boolean } | null = null;

// Saves run one at a time, so overlapping flushes never race each other.
let saveQueue: Promise<void> = Promise.resolve();

export function useKidsProgress() {
  const { user } = useAuth();
  const userKey = user?.id ?? user?._id ?? user?.email ?? "signed-out";

  const [progress, setProgress] = useState<ProgressMap>(() =>
    mergeProgress(cache?.userKey === userKey ? cache.progress : {}, pendingToProgress(readPending(userKey))),
  );
  const [status, setStatus] = useState<ProgressLoadStatus>(() => (cache?.userKey === userKey && cache.loaded ? "ready" : "loading"));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const userKeyRef = useRef(userKey);

  useEffect(() => {
    const loaded = status === "ready" || (cache?.userKey === userKey && cache.loaded);
    cache = { userKey, progress, loaded };
  }, [userKey, progress, status]);

  const flushPending = useCallback((): Promise<void> => {
    const run = async () => {
      for (const [levelId, stars] of Object.entries(readPending(userKey))) {
        try {
          const saved = await saveKidsProgress(levelId, stars);
          clearPending(userKey, levelId, saved.stars);
          if (userKeyRef.current === userKey) {
            setProgress((previous) => mergeProgress(previous, { [saved.levelId]: { stars: saved.stars, completedAt: saved.completedAt } }));
          }
        } catch (saveError) {
          // A 400 means the server will never accept this entry, so drop it
          // instead of retrying forever. Anything else (offline, 5xx, 429, an
          // expired session) stays queued for the next attempt.
          if (saveError instanceof ApiError && saveError.statusCode === 400) clearPending(userKey, levelId, 3);
        }
      }
    };
    const next = saveQueue.then(run, run);
    saveQueue = next;
    return next;
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;
    if (userKeyRef.current !== userKey) {
      userKeyRef.current = userKey;
      setProgress(pendingToProgress(readPending(userKey)));
      setStatus("loading");
    }

    getKidsProgress()
      .then((data) => {
        if (cancelled) return;
        const pending = readPending(userKey);
        // Merging with the previous state is safe (stars only ever go up) and
        // keeps a completion that was saved while this request was in flight.
        setProgress((previous) => mergeProgress(previous, progressFromServer(data?.levels), pendingToProgress(pending)));
        setStatus("ready");
        setError(null);
        if (Object.keys(pending).length > 0) void flushPending();
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(getErrorMessage(loadError, "Couldn't load your saved stars."));
        setStatus((current) => (current === "ready" ? "ready" : "error"));
      });

    return () => {
      cancelled = true;
    };
  }, [userKey, reloadKey, flushPending]);

  const recordCompletion = useCallback(
    async (levelId: string, stars: number): Promise<SaveResult> => {
      setProgress((previous) => mergeProgress(previous, { [levelId]: { stars, completedAt: previous[levelId]?.completedAt } }));
      addPending(userKey, levelId, stars);
      await flushPending();
      return readPending(userKey)[levelId] !== undefined ? "pending" : "saved";
    },
    [userKey, flushPending],
  );

  const retry = useCallback(() => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  return { progress, status, error, recordCompletion, retry };
}
