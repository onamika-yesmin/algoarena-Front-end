"use client";

// The block program builder: tap palette buttons to add blocks, and use each
// block's buttons to reorder, delete or change it. No drag and drop — every
// action is a real <button>, so it all works with a keyboard, a switch, or a
// small finger on a phone.

import { useRef, useState } from "react";
import { countBlocks, MAX_REPEAT, MIN_REPEAT, type Block, type ContainerBlock } from "@/lib/kids/puzzleEngine";
import {
  MAX_NESTING,
  ROOT_TARGET,
  findBlock,
  insertBlock,
  moveBlock,
  removeBlock,
  setRepeatTimes,
  targetDepth,
  type Branch,
  type InsertTarget,
} from "@/lib/kids/programEdit";
import type { PaletteBlock } from "@/lib/kids/types";
import { StarRow } from "../StarRow";
import { BlockIcon, PALETTE_INFO, blockIcon, blockLabel, blockTone, createBlock } from "./blockMeta";
import ui from "../kidsUi.module.css";
import styles from "./ProgramEditor.module.css";

export const MAX_PROGRAM_BLOCKS = 40;

interface ProgramEditorProps {
  program: Block[];
  onChange: (next: Block[]) => void;
  palette: PaletteBlock[];
  newBlocks?: PaletteBlock[];
  /** True while the program runs — editing is paused. */
  locked: boolean;
  activeBlockId: string | null;
  /** What an If block's sensor saw on the current step. */
  activeSensed: boolean | null;
  failedBlockId: string | null;
  optimalBlocks: number;
}

const branchBlocks = (block: ContainerBlock, branch: Branch): Block[] =>
  block.type === "if" ? (branch === "else" ? block.else : block.then) : block.body;

export function ProgramEditor({ program, onChange, palette, newBlocks, locked, activeBlockId, activeSensed, failedBlockId, optimalBlocks }: ProgramEditorProps) {
  const [target, setTarget] = useState<InsertTarget>(ROOT_TARGET);
  const [announcement, setAnnouncement] = useState("");
  const nextId = useRef(0);
  const programRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const total = countBlocks(program);
  const depth = targetDepth(program, target);
  // The target container may have been deleted — fall back to the main program.
  const activeTarget = depth === -1 ? ROOT_TARGET : target;
  const activeDepth = depth === -1 ? 0 : depth;
  const targetBlock = activeTarget.parentId ? findBlock(program, activeTarget.parentId) : null;
  const targetName = targetBlock
    ? `${blockLabel(targetBlock)}${targetBlock.type === "if" ? (activeTarget.branch === "else" ? " (otherwise)" : " (do this)") : ""}`
    : "the main program";

  const focusTool = (blockId: string, tool: string) =>
    requestAnimationFrame(() => {
      const row = programRef.current?.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
      const button =
        row?.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]:not(:disabled)`) ?? row?.querySelector<HTMLButtonElement>("[data-tool]:not(:disabled)");
      button?.focus();
    });

  const add = (kind: PaletteBlock) => {
    const block = createBlock(kind, `b${(nextId.current += 1)}`);
    onChange(insertBlock(program, activeTarget, block));
    const info = PALETTE_INFO[kind];
    if (info.container) {
      // New blocks go inside a freshly added Repeat / If until the kid picks another spot.
      setTarget({ parentId: block.id, branch: block.type === "if" ? "then" : "body" });
      setAnnouncement(`Added ${info.label} to ${targetName}. New blocks will now go inside it.`);
    } else {
      setAnnouncement(`Added ${info.label} to ${targetName}. ${total + 1} blocks.`);
    }
  };

  const move = (block: Block, delta: -1 | 1) => {
    onChange(moveBlock(program, block.id, delta));
    setAnnouncement(`Moved ${blockLabel(block)} ${delta === -1 ? "up" : "down"}.`);
    focusTool(block.id, delta === -1 ? "up" : "down");
  };

  const remove = (block: Block) => {
    onChange(removeBlock(program, block.id));
    setAnnouncement(`Deleted ${blockLabel(block)}.`);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const changeTimes = (block: Block, delta: number) => {
    if (block.type !== "repeat") return;
    const times = Math.min(MAX_REPEAT, Math.max(MIN_REPEAT, block.times + delta));
    onChange(setRepeatTimes(program, block.id, times));
    setAnnouncement(`Repeat ${times} times.`);
  };

  const choose = (next: InsertTarget, name: string) => {
    setTarget(next);
    setAnnouncement(`New blocks will go into ${name}.`);
  };

  const clearAll = () => {
    onChange([]);
    setTarget(ROOT_TARGET);
    setAnnouncement("Cleared the program.");
  };

  const renderBranch = (block: ContainerBlock, branch: Branch, caption: string | null) => {
    const list = branchBlocks(block, branch);
    const selected = activeTarget.parentId === block.id && activeTarget.branch === branch;
    const name = `${blockLabel(block)}${caption ? ` (${caption})` : ""}`;
    return (
      <div className={`${styles.branch} ${selected ? styles.branchSelected : ""}`}>
        {caption && <span className={styles.branchCaption}>{caption}</span>}
        {list.length > 0 ? <ol className={styles.list}>{list.map((child, index) => renderBlock(child, index, list.length))}</ol> : null}
        <button type="button" className={styles.slot} aria-pressed={selected} disabled={locked} onClick={() => choose({ parentId: block.id, branch }, name)}>
          {selected ? "✓ New blocks go here" : list.length ? "+ Add more here" : "+ Add blocks here"}
          <span className={ui.srOnly}> — {name}</span>
        </button>
      </div>
    );
  };

  const renderBlock = (block: Block, index: number, siblings: number) => {
    const label = blockLabel(block);
    const isActive = block.id === activeBlockId;
    return (
      <li
        key={block.id}
        data-block-id={block.id}
        className={`${styles.block} ${styles[`tone_${blockTone(block)}`]} ${isActive ? styles.active : ""} ${block.id === failedBlockId ? styles.failed : ""}`}
      >
        <div className={styles.blockBar}>
          <span className={styles.blockIcon} aria-hidden="true">
            <BlockIcon name={blockIcon(block)} />
          </span>
          <span className={styles.blockLabel}>{block.type === "repeat" ? "Repeat" : label}</span>
          {block.type === "repeat" && (
            <span className={styles.stepper}>
              <button
                type="button"
                data-tool="fewer"
                className={styles.stepButton}
                aria-label={`Fewer times (now ${block.times})`}
                disabled={locked || block.times <= MIN_REPEAT}
                onClick={() => changeTimes(block, -1)}
              >
                −
              </button>
              <span className={styles.times} aria-hidden="true">
                {block.times}
              </span>
              <button
                type="button"
                data-tool="more"
                className={styles.stepButton}
                aria-label={`More times (now ${block.times})`}
                disabled={locked || block.times >= MAX_REPEAT}
                onClick={() => changeTimes(block, 1)}
              >
                +
              </button>
              <span className={styles.timesWord}>times</span>
            </span>
          )}
          {isActive && block.type === "if" && activeSensed !== null && (
            <span className={`${styles.sensed} ${activeSensed ? styles.sensedYes : ""}`} aria-hidden="true">
              {activeSensed ? "Yes!" : "No"}
            </span>
          )}
          <span className={styles.tools}>
            <button type="button" data-tool="up" className={styles.tool} aria-label={`Move ${label} up`} disabled={locked || index === 0} onClick={() => move(block, -1)}>
              ↑
            </button>
            <button
              type="button"
              data-tool="down"
              className={styles.tool}
              aria-label={`Move ${label} down`}
              disabled={locked || index === siblings - 1}
              onClick={() => move(block, 1)}
            >
              ↓
            </button>
            <button type="button" data-tool="delete" className={`${styles.tool} ${styles.toolDelete}`} aria-label={`Delete ${label}`} disabled={locked} onClick={() => remove(block)}>
              ✕
            </button>
          </span>
        </div>
        {(block.type === "repeat" || block.type === "repeatUntil") && renderBranch(block, "body", null)}
        {block.type === "if" && (
          <>
            {renderBranch(block, "then", "do this")}
            {renderBranch(block, "else", "otherwise")}
          </>
        )}
      </li>
    );
  };

  const rootSelected = activeTarget.parentId === null;
  const full = total >= MAX_PROGRAM_BLOCKS;

  return (
    <div className={styles.editor}>
      <section className={`${ui.card} ${styles.palette}`} aria-labelledby="kq-palette-title">
        <div className={styles.paletteHead}>
          <h2 id="kq-palette-title">Blocks</h2>
          <p className={styles.target}>
            Adding to: <b>{targetName}</b>
          </p>
        </div>
        <div className={styles.paletteGrid}>
          {palette.map((kind) => {
            const info = PALETTE_INFO[kind];
            const tooDeep = info.container && activeDepth >= MAX_NESTING;
            return (
              <button
                key={kind}
                type="button"
                className={`${styles.paletteButton} ${styles[`tone_${info.tone}`]}`}
                onClick={() => add(kind)}
                disabled={locked || full || tooDeep}
                title={tooDeep ? "That's as deep as blocks can go" : undefined}
              >
                <span className={styles.blockIcon} aria-hidden="true">
                  <BlockIcon name={info.icon} />
                </span>
                <span>
                  <span className={ui.srOnly}>Add </span>
                  {info.label}
                </span>
                {newBlocks?.includes(kind) && <em className={styles.newTag}>NEW</em>}
              </button>
            );
          })}
        </div>
        {full && <p className={styles.fullNote}>That&apos;s a lot of blocks! Can a loop make your program shorter?</p>}
      </section>

      <section className={`${ui.card} ${styles.programCard}`} aria-labelledby="kq-program-title">
        <div className={styles.programHead}>
          <h2 id="kq-program-title" ref={headingRef} tabIndex={-1}>
            Your program
          </h2>
          <span className={styles.count}>
            {total} {total === 1 ? "block" : "blocks"}
          </span>
        </div>
        <p className={styles.starGoal}>
          <StarRow stars={3} size="sm" label="3 stars" /> with {optimalBlocks} blocks or fewer
        </p>

        <div ref={programRef} className={`${styles.root} ${rootSelected ? styles.branchSelected : ""}`}>
          {program.length > 0 ? (
            <ol className={styles.list}>{program.map((block, index) => renderBlock(block, index, program.length))}</ol>
          ) : (
            <p className={styles.emptyProgram}>Tap a block to start your program!</p>
          )}
          {program.length > 0 && (
            <button type="button" className={styles.slot} aria-pressed={rootSelected} disabled={locked} onClick={() => choose(ROOT_TARGET, "the main program")}>
              {rootSelected ? "✓ New blocks go at the end" : "+ Add blocks at the end"}
            </button>
          )}
        </div>

        {program.length > 0 && (
          <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall} ${styles.clear}`} onClick={clearAll} disabled={locked}>
            <span aria-hidden="true">🧹</span> Clear all
          </button>
        )}
      </section>

      <p className={ui.srOnly} aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
