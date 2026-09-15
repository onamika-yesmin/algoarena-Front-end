// Code Quest block-puzzle engine. Pure TypeScript (no React, no DOM) so the
// same code animates the robot in the browser and verifies the curriculum
// from a script (lib/kids/verifyCurriculum.local.mts).
//
// A board is a small grid of walls, a start cell + facing, a goal flag and
// optional gems. A program is a tree of blocks. runProgram() executes it and
// returns every intermediate robot state (for step-by-step animation) plus
// the outcome, with hard caps on actions and evaluations so a loop that never
// ends can't hang the page.

export type Direction = "N" | "E" | "S" | "W";

export type ActionBlockType = "forward" | "turnLeft" | "turnRight" | "collect";

export type Condition = "wallAhead" | "pathLeft" | "pathRight" | "gemHere";

export type Block =
  | { id: string; type: ActionBlockType }
  | { id: string; type: "repeat"; times: number; body: Block[] }
  | { id: string; type: "repeatUntil"; body: Block[] }
  | { id: string; type: "if"; condition: Condition; then: Block[]; else: Block[] };

export type ContainerBlock = Extract<Block, { type: "repeat" | "repeatUntil" | "if" }>;

export interface Position {
  x: number;
  y: number;
}

export interface Board {
  width: number;
  height: number;
  /** walls[y][x] — true where the robot can't go. Cells off the grid count as walls too. */
  walls: boolean[][];
  start: Position & { dir: Direction };
  goal: Position;
  gems: Position[];
}

export interface RobotState {
  x: number;
  y: number;
  dir: Direction;
  /** Cumulative quarter turns (right = +1, left = -1). Lets the UI rotate smoothly instead of spinning the long way round. */
  spin: number;
  /** Indexes into board.gems that have been picked up, in pick-up order. */
  collected: number[];
}

export type StepKind = "start" | "move" | "turn" | "collect" | "bump" | "noGem" | "check";

export interface ExecutionStep {
  kind: StepKind;
  /** The block that produced this step (null for the starting position). */
  blockId: string | null;
  state: RobotState;
  /** 1-based count of robot actions (moves, turns, pick-ups) so far, including this step. */
  action: number;
  /** For "check" steps: what the sensor saw. */
  sensed?: boolean;
}

export type Outcome =
  /** Reached the flag with every gem collected. */
  | "success"
  /** A Move forward hit a wall or the edge of the board. */
  | "crashed"
  /** Pick up gem was used on a square with no gem. */
  | "noGem"
  /** The program finished somewhere other than the flag. */
  | "notAtGoal"
  /** The program finished on the flag but gems were left behind. */
  | "gemsLeft"
  /** Too many actions/evaluations — almost always a loop that never ends. */
  | "tooLong"
  /** Nothing to run. */
  | "empty";

export interface ExecutionResult {
  outcome: Outcome;
  steps: ExecutionStep[];
  /** Action number (1-based) where the run failed, for "crashed" and "noGem". */
  failedAction?: number;
  failedBlockId?: string;
  finalState: RobotState;
  gemsLeft: number;
}

export const MIN_REPEAT = 2;
export const MAX_REPEAT = 10;
/** Robot actions (moves, turns, pick-ups) allowed in one run. */
export const MAX_ACTIONS = 200;
/** Block evaluations + loop iterations allowed in one run (catches loops with no actions in them). */
export const MAX_TICKS = 1000;

const DIRECTIONS: readonly Direction[] = ["N", "E", "S", "W"];

const DELTA: Record<Direction, Position> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export const turnDirection = (dir: Direction, quarterTurns: number): Direction =>
  DIRECTIONS[(((DIRECTIONS.indexOf(dir) + quarterTurns) % 4) + 4) % 4];

/**
 * Parses a board from rows of characters:
 * `#` wall · `.` floor · `S` start · `G` goal flag · `*` gem.
 */
export function parseBoard(rows: readonly string[], startDir: Direction): Board {
  if (rows.length === 0) throw new Error("A board needs at least one row.");
  const width = rows[0].length;
  const walls: boolean[][] = [];
  const gems: Position[] = [];
  let start: (Position & { dir: Direction }) | null = null;
  let goal: Position | null = null;

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    if (row.length !== width) throw new Error(`Board row ${y + 1} has ${row.length} cells; expected ${width}.`);
    const wallRow: boolean[] = [];
    for (let x = 0; x < width; x += 1) {
      const cell = row[x];
      if (cell === "#") {
        wallRow.push(true);
        continue;
      }
      wallRow.push(false);
      if (cell === "S") {
        if (start) throw new Error("A board can only have one start (S).");
        start = { x, y, dir: startDir };
      } else if (cell === "G") {
        if (goal) throw new Error("A board can only have one goal (G).");
        goal = { x, y };
      } else if (cell === "*") {
        gems.push({ x, y });
      } else if (cell !== ".") {
        throw new Error(`Unknown board cell "${cell}" at column ${x + 1}, row ${y + 1}.`);
      }
    }
    walls.push(wallRow);
  }

  if (!start) throw new Error("A board needs a start (S).");
  if (!goal) throw new Error("A board needs a goal (G).");
  return { width, height: rows.length, walls, start, goal, gems };
}

export const isOpen = (board: Board, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < board.width && y < board.height && !board.walls[y][x];

export const startState = (board: Board): RobotState => ({
  x: board.start.x,
  y: board.start.y,
  dir: board.start.dir,
  spin: 0,
  collected: [],
});

/** Index of an uncollected gem under the robot, or -1. */
export const gemIndexAt = (board: Board, state: RobotState): number =>
  board.gems.findIndex((gem, index) => gem.x === state.x && gem.y === state.y && !state.collected.includes(index));

export function senses(board: Board, state: RobotState, condition: Condition): boolean {
  const look = (quarterTurns: number) => {
    const delta = DELTA[turnDirection(state.dir, quarterTurns)];
    return isOpen(board, state.x + delta.x, state.y + delta.y);
  };
  switch (condition) {
    case "wallAhead":
      return !look(0);
    case "pathLeft":
      return look(-1);
    case "pathRight":
      return look(1);
    case "gemHere":
      return gemIndexAt(board, state) !== -1;
  }
}

export const childLists = (block: Block): Block[][] => {
  switch (block.type) {
    case "repeat":
    case "repeatUntil":
      return [block.body];
    case "if":
      return [block.then, block.else];
    default:
      return [];
  }
};

/** Every block counts as one, including container blocks (a Repeat with two blocks inside = 3). */
export const countBlocks = (blocks: readonly Block[]): number =>
  blocks.reduce((total, block) => total + 1 + childLists(block).reduce((sum, list) => sum + countBlocks(list), 0), 0);

/** How many blocks above the optimal count still earn 2 stars. */
export const twoStarAllowance = (optimalBlocks: number): number => Math.max(2, Math.ceil(optimalBlocks * 0.25));

export function starsForBlocks(blocksUsed: number, optimalBlocks: number): 1 | 2 | 3 {
  if (blocksUsed <= optimalBlocks) return 3;
  if (blocksUsed <= optimalBlocks + twoStarAllowance(optimalBlocks)) return 2;
  return 1;
}

class Halt {
  constructor(readonly outcome: Outcome) {}
}

export function runProgram(board: Board, program: readonly Block[]): ExecutionResult {
  let state = startState(board);
  const steps: ExecutionStep[] = [{ kind: "start", blockId: null, state, action: 0 }];
  if (countBlocks(program) === 0) {
    return { outcome: "empty", steps, finalState: state, gemsLeft: board.gems.length };
  }

  let actions = 0;
  let ticks = 0;
  let failedAction: number | undefined;
  let failedBlockId: string | undefined;

  const gemsLeft = () => board.gems.length - state.collected.length;
  const atGoal = () => state.x === board.goal.x && state.y === board.goal.y;
  const finishedLevel = () => atGoal() && gemsLeft() === 0;

  const tick = () => {
    ticks += 1;
    if (ticks > MAX_TICKS) throw new Halt("tooLong");
  };

  const act = (block: Block, kind: StepKind, next: RobotState) => {
    actions += 1;
    if (actions > MAX_ACTIONS) throw new Halt("tooLong");
    state = next;
    steps.push({ kind, blockId: block.id, state, action: actions });
  };

  const fail = (block: Block, kind: "bump" | "noGem", outcome: Outcome): never => {
    act(block, kind, state);
    failedAction = actions;
    failedBlockId = block.id;
    throw new Halt(outcome);
  };

  const run = (blocks: readonly Block[]) => {
    for (const block of blocks) {
      tick();
      switch (block.type) {
        case "forward": {
          const delta = DELTA[state.dir];
          const x = state.x + delta.x;
          const y = state.y + delta.y;
          if (!isOpen(board, x, y)) fail(block, "bump", "crashed");
          act(block, "move", { ...state, x, y });
          if (finishedLevel()) throw new Halt("success");
          break;
        }
        case "turnLeft":
          act(block, "turn", { ...state, dir: turnDirection(state.dir, -1), spin: state.spin - 1 });
          break;
        case "turnRight":
          act(block, "turn", { ...state, dir: turnDirection(state.dir, 1), spin: state.spin + 1 });
          break;
        case "collect": {
          const gem = gemIndexAt(board, state);
          if (gem === -1) fail(block, "noGem", "noGem");
          act(block, "collect", { ...state, collected: [...state.collected, gem] });
          if (finishedLevel()) throw new Halt("success");
          break;
        }
        case "repeat":
          for (let iteration = 0; iteration < block.times; iteration += 1) {
            tick();
            run(block.body);
          }
          break;
        case "repeatUntil":
          while (!atGoal()) {
            tick();
            run(block.body);
          }
          break;
        case "if": {
          const sensed = senses(board, state, block.condition);
          steps.push({ kind: "check", blockId: block.id, state, action: actions, sensed });
          run(sensed ? block.then : block.else);
          break;
        }
      }
    }
  };

  let outcome: Outcome;
  try {
    run(program);
    outcome = atGoal() ? (gemsLeft() === 0 ? "success" : "gemsLeft") : "notAtGoal";
  } catch (error) {
    if (!(error instanceof Halt)) throw error;
    outcome = error.outcome;
  }

  return { outcome, steps, failedAction, failedBlockId, finalState: state, gemsLeft: gemsLeft() };
}

const CONDITION_CODES: Record<string, Condition> = {
  wall: "wallAhead",
  left: "pathLeft",
  right: "pathRight",
  gem: "gemHere",
};

/**
 * Parses the compact program notation used for level solutions and tests:
 * `F` forward · `L` turn left · `R` turn right · `P` pick up gem ·
 * `3{…}` repeat 3 times · `U{…}` repeat until the flag ·
 * `?wall{…}:{…}` if wall ahead / otherwise (also `?left`, `?right`, `?gem`; the `:{…}` part is optional).
 * Whitespace is ignored. Example: `U{?wall{R}:{F}}`.
 */
export function parseProgram(source: string): Block[] {
  let pos = 0;
  let nextId = 0;
  const id = () => `p${(nextId += 1)}`;
  const skipSpace = () => {
    while (pos < source.length && /\s/.test(source[pos])) pos += 1;
  };
  const expect = (char: string) => {
    skipSpace();
    if (source[pos] !== char) throw new Error(`Expected "${char}" at position ${pos} in "${source}".`);
    pos += 1;
  };

  const parseList = (insideBraces: boolean): Block[] => {
    const blocks: Block[] = [];
    for (;;) {
      skipSpace();
      if (pos >= source.length) {
        if (insideBraces) throw new Error(`Missing "}" in "${source}".`);
        return blocks;
      }
      if (source[pos] === "}") {
        if (!insideBraces) throw new Error(`Unexpected "}" at position ${pos} in "${source}".`);
        pos += 1;
        return blocks;
      }
      blocks.push(parseBlock());
    }
  };

  const parseBody = () => {
    expect("{");
    return parseList(true);
  };

  const parseBlock = (): Block => {
    const char = source[pos];
    const simple: Record<string, ActionBlockType> = { F: "forward", L: "turnLeft", R: "turnRight", P: "collect" };
    if (simple[char]) {
      pos += 1;
      return { id: id(), type: simple[char] };
    }
    if (char === "U") {
      pos += 1;
      const blockId = id();
      return { id: blockId, type: "repeatUntil", body: parseBody() };
    }
    if (/\d/.test(char)) {
      let digits = "";
      while (pos < source.length && /\d/.test(source[pos])) digits += source[pos++];
      const blockId = id();
      return { id: blockId, type: "repeat", times: Number(digits), body: parseBody() };
    }
    if (char === "?") {
      pos += 1;
      const match = /^(wall|left|right|gem)/.exec(source.slice(pos));
      if (!match) throw new Error(`Unknown condition at position ${pos} in "${source}".`);
      pos += match[1].length;
      const blockId = id();
      const thenBody = parseBody();
      skipSpace();
      let elseBody: Block[] = [];
      if (source[pos] === ":") {
        pos += 1;
        elseBody = parseBody();
      }
      return { id: blockId, type: "if", condition: CONDITION_CODES[match[1]], then: thenBody, else: elseBody };
    }
    throw new Error(`Unexpected "${char}" at position ${pos} in "${source}".`);
  };

  return parseList(false);
}
