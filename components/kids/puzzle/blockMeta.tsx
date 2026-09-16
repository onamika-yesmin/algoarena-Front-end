// Labels, colours and icons for Code Quest blocks, shared by the palette and the program list.

import type { Block, Condition } from "@/lib/kids/puzzleEngine";
import type { PaletteBlock } from "@/lib/kids/types";

export type BlockTone = "move" | "turn" | "gem" | "loop" | "logic";
export type IconName = "forward" | "left" | "right" | "gem" | "repeat" | "until" | "if";

export const CONDITION_LABEL: Record<Condition, string> = {
  wallAhead: "wall ahead",
  pathLeft: "path to the left",
  pathRight: "path to the right",
  gemHere: "gem here",
};

export const PALETTE_INFO: Record<PaletteBlock, { label: string; tone: BlockTone; icon: IconName; container: boolean }> = {
  forward: { label: "Move forward", tone: "move", icon: "forward", container: false },
  turnLeft: { label: "Turn left", tone: "turn", icon: "left", container: false },
  turnRight: { label: "Turn right", tone: "turn", icon: "right", container: false },
  collect: { label: "Pick up gem", tone: "gem", icon: "gem", container: false },
  repeat: { label: "Repeat", tone: "loop", icon: "repeat", container: true },
  repeatUntil: { label: "Repeat until flag", tone: "loop", icon: "until", container: true },
  ifWallAhead: { label: "If wall ahead", tone: "logic", icon: "if", container: true },
  ifPathLeft: { label: "If path to the left", tone: "logic", icon: "if", container: true },
  ifPathRight: { label: "If path to the right", tone: "logic", icon: "if", container: true },
  ifGemHere: { label: "If gem here", tone: "logic", icon: "if", container: true },
};

const CONDITION_FOR: Partial<Record<PaletteBlock, Condition>> = {
  ifWallAhead: "wallAhead",
  ifPathLeft: "pathLeft",
  ifPathRight: "pathRight",
  ifGemHere: "gemHere",
};

export function createBlock(kind: PaletteBlock, id: string): Block {
  switch (kind) {
    case "forward":
    case "turnLeft":
    case "turnRight":
    case "collect":
      return { id, type: kind };
    case "repeat":
      return { id, type: "repeat", times: 3, body: [] };
    case "repeatUntil":
      return { id, type: "repeatUntil", body: [] };
    default:
      return { id, type: "if", condition: CONDITION_FOR[kind] ?? "wallAhead", then: [], else: [] };
  }
}

export function blockLabel(block: Block): string {
  switch (block.type) {
    case "forward":
      return "Move forward";
    case "turnLeft":
      return "Turn left";
    case "turnRight":
      return "Turn right";
    case "collect":
      return "Pick up gem";
    case "repeat":
      return `Repeat ${block.times} times`;
    case "repeatUntil":
      return "Repeat until flag";
    case "if":
      return `If ${CONDITION_LABEL[block.condition]}`;
  }
}

export function blockTone(block: Block): BlockTone {
  switch (block.type) {
    case "forward":
      return "move";
    case "turnLeft":
    case "turnRight":
      return "turn";
    case "collect":
      return "gem";
    case "repeat":
    case "repeatUntil":
      return "loop";
    case "if":
      return "logic";
  }
}

export function blockIcon(block: Block): IconName {
  switch (block.type) {
    case "forward":
      return "forward";
    case "turnLeft":
      return "left";
    case "turnRight":
      return "right";
    case "collect":
      return "gem";
    case "repeat":
      return "repeat";
    case "repeatUntil":
      return "until";
    case "if":
      return "if";
  }
}

const ICON_PATHS: Record<IconName, string[]> = {
  forward: ["M12 20V5", "M5.5 11.5 12 5l6.5 6.5"],
  left: ["M9 14 4 9l5-5", "M4 9h9a6 6 0 0 1 6 6v5"],
  right: ["m15 14 5-5-5-5", "M20 9h-9a6 6 0 0 0-6 6v5"],
  gem: ["M6 4h12l4 5-10 12L2 9z", "M2 9h20", "M12 21 8.5 9 12 4l3.5 5z"],
  repeat: ["m17 2 4 4-4 4", "M3 11V9a3 3 0 0 1 3-3h15", "m7 22-4-4 4-4", "M21 13v2a3 3 0 0 1-3 3H3"],
  until: ["M6 22V3", "M6 4h11l-2.5 4L17 12H6"],
  if: ["M12 2 22 12 12 22 2 12z", "M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4", "M12 17h.01"],
};

export function BlockIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
