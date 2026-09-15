// Immutable edits on a Code Quest block program (a tree of blocks). Pure
// functions, no React — the program editor calls these from button handlers.

import type { Block } from "./puzzleEngine";

export type Branch = "body" | "then" | "else";

/** Where new blocks from the palette go: the end of the main program, or the end of one branch of a container block. */
export interface InsertTarget {
  parentId: string | null;
  branch: Branch;
}

export const ROOT_TARGET: InsertTarget = { parentId: null, branch: "body" };

/** Blocks nest at most this deep (a loop in a loop in a loop), so the program stays readable on a phone. */
export const MAX_NESTING = 3;

function mapChildren(block: Block, transform: (list: Block[], branch: Branch) => Block[]): Block {
  switch (block.type) {
    case "repeat":
    case "repeatUntil":
      return { ...block, body: transform(block.body, "body") };
    case "if":
      return { ...block, then: transform(block.then, "then"), else: transform(block.else, "else") };
    default:
      return block;
  }
}

export function insertBlock(program: Block[], target: InsertTarget, newBlock: Block): Block[] {
  if (target.parentId === null) return [...program, newBlock];
  return program.map((block) =>
    block.id === target.parentId
      ? mapChildren(block, (list, branch) => (branch === target.branch ? [...list, newBlock] : list))
      : mapChildren(block, (list) => insertBlock(list, target, newBlock)),
  );
}

export function removeBlock(program: Block[], id: string): Block[] {
  return program.filter((block) => block.id !== id).map((block) => mapChildren(block, (list) => removeBlock(list, id)));
}

/** Swaps a block with its neighbour in the same list. Returns the same array when it can't move. */
export function moveBlock(program: Block[], id: string, delta: -1 | 1): Block[] {
  const index = program.findIndex((block) => block.id === id);
  if (index !== -1) {
    const swapWith = index + delta;
    if (swapWith < 0 || swapWith >= program.length) return program;
    const next = [...program];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    return next;
  }
  return program.map((block) => mapChildren(block, (list) => moveBlock(list, id, delta)));
}

export function setRepeatTimes(program: Block[], id: string, times: number): Block[] {
  return program.map((block) =>
    block.id === id && block.type === "repeat" ? { ...block, times } : mapChildren(block, (list) => setRepeatTimes(list, id, times)),
  );
}

export function findBlock(program: readonly Block[], id: string): Block | null {
  for (const block of program) {
    if (block.id === id) return block;
    const lists = block.type === "if" ? [block.then, block.else] : block.type === "repeat" || block.type === "repeatUntil" ? [block.body] : [];
    for (const list of lists) {
      const found = findBlock(list, id);
      if (found) return found;
    }
  }
  return null;
}

/** How many containers deep a target list is (the main program is 0). Returns -1 when the target no longer exists. */
export function targetDepth(program: readonly Block[], target: InsertTarget, depth = 0): number {
  if (target.parentId === null) return 0;
  for (const block of program) {
    if (block.id === target.parentId) return depth + 1;
    const lists = block.type === "if" ? [block.then, block.else] : block.type === "repeat" || block.type === "repeatUntil" ? [block.body] : [];
    for (const list of lists) {
      const found = targetDepth(list, target, depth + 1);
      if (found !== -1) return found;
    }
  }
  return -1;
}
