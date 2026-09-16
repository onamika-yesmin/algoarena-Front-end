import { apiRequest } from "./client";

/** One completed Code Quest level, as stored by the back end (best stars + first completion). */
export interface KidsLevelProgress {
  levelId: string;
  stars: number;
  completedAt: string;
}

export interface KidsProgressList {
  levels: KidsLevelProgress[];
}

export const getKidsProgress = () => apiRequest<KidsProgressList>("/api/kids/progress");

/** Saves a completion. The server keeps the best stars and the first completion time. */
export const saveKidsProgress = (levelId: string, stars: number) =>
  apiRequest<KidsLevelProgress>(`/api/kids/progress/${encodeURIComponent(levelId)}`, { method: "PUT", body: { stars } });
