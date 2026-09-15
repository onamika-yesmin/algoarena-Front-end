// The Code Quest learning path: five worlds from "give the robot directions"
// to small Python programs. Levels unlock strictly in this order.

import { CAVES_LEVELS, LAGOON_LEVELS, MEADOW_LEVELS } from "./levelsBlocks";
import { ISLAND_LEVELS, STATION_LEVELS } from "./levelsPython";
import type { Level, World } from "./types";

export const WORLDS: World[] = [
  {
    id: "meadow",
    number: 1,
    name: "Sunny Meadow",
    concept: "Sequences",
    tagline: "Give Bolt step-by-step directions.",
    emoji: "🌼",
    kind: "puzzle",
    badge: { name: "Trailblazer", emoji: "🥾", description: "Finished Sunny Meadow" },
    parents: {
      summary: "Kids put commands in the right order to guide a robot. That's the idea behind every program.",
      skills: ["Writing step-by-step instructions", "Left and right from someone else's point of view", "Finding and fixing mistakes (debugging)"],
    },
    levels: MEADOW_LEVELS,
  },
  {
    id: "lagoon",
    number: 2,
    name: "Loop Lagoon",
    concept: "Loops",
    tagline: "Spot patterns and repeat them.",
    emoji: "🌊",
    kind: "puzzle",
    badge: { name: "Loop Legend", emoji: "🐬", description: "Finished Loop Lagoon" },
    parents: {
      summary: "Kids spot repeating patterns and use loops to turn long programs into short ones.",
      skills: ["Recognising patterns", "Repeat blocks (loops)", "Loops inside loops (nesting)"],
    },
    levels: LAGOON_LEVELS,
  },
  {
    id: "caves",
    number: 3,
    name: "Crystal Caves",
    concept: "Conditions",
    tagline: "Teach Bolt to make smart choices.",
    emoji: "💎",
    kind: "puzzle",
    badge: { name: "Cave Explorer", emoji: "🔦", description: "Finished Crystal Caves" },
    parents: {
      summary: "Kids use sensors and if/otherwise decisions so one program can handle many situations.",
      skills: ["If / otherwise decisions", "Loops that repeat until a goal is reached", "Planning a general strategy instead of a fixed path"],
    },
    levels: CAVES_LEVELS,
  },
  {
    id: "island",
    number: 4,
    name: "Python Island",
    concept: "First Python",
    tagline: "Type your very first real code.",
    emoji: "🏝️",
    kind: "python",
    badge: { name: "Python Pal", emoji: "🐍", description: "Finished Python Island" },
    parents: {
      summary: "Kids move from blocks to typing real Python: printing messages, working with text, and doing maths.",
      skills: ["print() and text (strings)", "Numbers and the + - * operators", "Order of operations and brackets"],
    },
    levels: ISLAND_LEVELS,
  },
  {
    id: "station",
    number: 5,
    name: "Star Station",
    concept: "Tiny programs",
    tagline: "Variables, questions, choices and loops.",
    emoji: "🚀",
    kind: "python",
    badge: { name: "Star Coder", emoji: "🌟", description: "Finished Star Station" },
    parents: {
      summary: "Kids write small programs that remember values, ask questions, make decisions and repeat actions.",
      skills: ["Variables", "Reading input and turning it into numbers", "if / else and for loops"],
    },
    levels: STATION_LEVELS,
  },
];

export interface LevelRef {
  world: World;
  level: Level;
  /** 0-based position inside its world. */
  indexInWorld: number;
  /** 0-based position in the whole path. */
  globalIndex: number;
}

export const ALL_LEVELS: LevelRef[] = WORLDS.flatMap((world, worldIndex) =>
  world.levels.map((level, indexInWorld) => ({
    world,
    level,
    indexInWorld,
    globalIndex: WORLDS.slice(0, worldIndex).reduce((sum, previous) => sum + previous.levels.length, 0) + indexInWorld,
  })),
);

export const TOTAL_LEVELS = ALL_LEVELS.length;
export const MAX_STARS = TOTAL_LEVELS * 3;

export const levelHref = (worldId: string, slug: string) => `/kids/${worldId}/${slug}`;

export const findLevel = (worldId: string, slug: string): LevelRef | null =>
  ALL_LEVELS.find((ref) => ref.world.id === worldId && ref.level.slug === slug) ?? null;

export const findLevelById = (levelId: string): LevelRef | null => ALL_LEVELS.find((ref) => ref.level.id === levelId) ?? null;

export const previousLevel = (ref: LevelRef): LevelRef | null => ALL_LEVELS[ref.globalIndex - 1] ?? null;

export const nextLevel = (ref: LevelRef): LevelRef | null => ALL_LEVELS[ref.globalIndex + 1] ?? null;
