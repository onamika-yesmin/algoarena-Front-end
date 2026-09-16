// Curriculum data types for Code Quest (the AlgoArena Kids section).

import type { Direction } from "./puzzleEngine";

export type WorldId = "meadow" | "lagoon" | "caves" | "island" | "station";

/** Blocks a puzzle level can offer in its palette. Each `if…` item creates an if/otherwise block with that sensor. */
export type PaletteBlock =
  | "forward"
  | "turnLeft"
  | "turnRight"
  | "collect"
  | "repeat"
  | "repeatUntil"
  | "ifWallAhead"
  | "ifPathLeft"
  | "ifPathRight"
  | "ifGemHere";

interface LevelBase {
  /** Globally unique, `${worldId}-${slug}`; also the progress key saved to the back end. */
  id: string;
  /** URL segment: /kids/[worldId]/[slug]. */
  slug: string;
  title: string;
  /** One or two short sentences Bolt says at the start of the level. */
  story: string;
  /** Revealed one at a time. Text between `backticks` renders as code. */
  hints: string[];
}

export interface PuzzleLevel extends LevelBase {
  kind: "puzzle";
  goal: string;
  /** Rows of `#` wall · `.` floor · `S` start · `G` flag · `*` gem (see parseBoard). */
  board: readonly string[];
  startDir: Direction;
  palette: PaletteBlock[];
  /** Palette items to tag as NEW on this level. */
  newBlocks?: PaletteBlock[];
  /** 3 stars at or under this many blocks. */
  optimalBlocks: number;
  /** A reference solution in parseProgram notation, using exactly optimalBlocks blocks. */
  solution: string;
}

export interface PythonTest {
  /** Typed into the program's input() calls. Omit when the level doesn't use input(). */
  stdin?: string;
  expected: string;
  /** Outputs we can predict from a typical slip, each with a tailored tip. */
  mistakes?: { output: string; tip: string }[];
}

export interface PythonLevel extends LevelBase {
  kind: "python";
  /** Short teaching points. `backticks` render as code. */
  learn: string[];
  example: { code: string; stdin?: string; output: string };
  task: string;
  starterCode: string;
  /** Run in order; later tests only run once earlier ones pass. */
  tests: PythonTest[];
  /** Reference solution — its output must match every test's expected output. */
  solution: string;
}

export type Level = PuzzleLevel | PythonLevel;

export interface World {
  id: WorldId;
  number: number;
  name: string;
  /** The big idea, e.g. "Loops". */
  concept: string;
  tagline: string;
  emoji: string;
  kind: "puzzle" | "python";
  badge: { name: string; emoji: string; description: string };
  parents: { summary: string; skills: string[] };
  levels: Level[];
}
