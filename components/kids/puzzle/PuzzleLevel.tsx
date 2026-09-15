"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  countBlocks,
  parseBoard,
  runProgram,
  startState,
  starsForBlocks,
  type Block,
  type ExecutionResult,
  type ExecutionStep,
} from "@/lib/kids/puzzleEngine";
import type { PuzzleLevel as PuzzleLevelData, World } from "@/lib/kids/types";
import { Mascot, type MascotMood } from "../Mascot";
import { RichText } from "../StarRow";
import { PuzzleBoard, type BoardEffect } from "./PuzzleBoard";
import { ProgramEditor } from "./ProgramEditor";
import ui from "../kidsUi.module.css";
import styles from "./PuzzleLevel.module.css";

type RunView =
  | { status: "idle" }
  | { status: "running" | "finished"; result: ExecutionResult; steps: ExecutionStep[]; index: number; blocksUsed: number };

interface PuzzleLevelProps {
  level: PuzzleLevelData;
  world: World;
  onSolved: (stars: 1 | 2 | 3) => void;
  /** Bumped by the parent's "Play again" — puts Bolt back at the start, keeping the program. */
  replayToken: number;
}

const FACING = { N: "up", E: "right", S: "down", W: "left" } as const;
// A never-ending loop can produce hundreds of steps; show just enough to see it spin.
const MAX_ANIMATED_STEPS_WHEN_TOO_LONG = 48;

function describeResult(result: ExecutionResult, blocksUsed: number, optimal: number): { good: boolean; title: string; detail: string; mood: MascotMood } {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  switch (result.outcome) {
    case "success":
      return {
        good: true,
        title: "Hooray! Bolt made it!",
        detail: starsForBlocks(blocksUsed, optimal) === 3 ? `Perfect! You used ${plural(blocksUsed, "block")}.` : `You used ${plural(blocksUsed, "block")}. Can you do it with ${optimal}?`,
        mood: "cheer",
      };
    case "crashed":
      return { good: false, title: `Oops! Bolt bumped into a wall on step ${result.failedAction}.`, detail: "Find the red block and try a different move.", mood: "oops" };
    case "noGem":
      return { good: false, title: `Hmm, there's no gem to pick up on step ${result.failedAction}.`, detail: "Pick up gem only works when Bolt is standing on a gem.", mood: "think" };
    case "notAtGoal":
      return {
        good: false,
        title: "Bolt stopped before reaching the flag.",
        detail: result.gemsLeft > 0 ? `Keep going! There's still ${plural(result.gemsLeft, "gem")} to collect, too.` : "Add more blocks to finish the path.",
        mood: "think",
      };
    case "gemsLeft":
      return { good: false, title: `Bolt reached the flag but left ${plural(result.gemsLeft, "gem")} behind!`, detail: "Pick up every gem before you finish.", mood: "think" };
    case "tooLong":
      return { good: false, title: "Whoa, Bolt is getting dizzy!", detail: "The program kept going for too long. Is there a loop that never ends?", mood: "oops" };
    case "empty":
      return { good: false, title: "Your program is empty!", detail: "Tap some blocks to build a program, then press Run.", mood: "think" };
  }
}

export function PuzzleLevel({ level, world, onSolved, replayToken }: PuzzleLevelProps) {
  const board = useMemo(() => parseBoard(level.board, level.startDir), [level.board, level.startDir]);
  const [program, setProgram] = useState<Block[]>([]);
  const [run, setRun] = useState<RunView>({ status: "idle" });
  const [fast, setFast] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const onSolvedRef = useRef(onSolved);
  const lastReplay = useRef(replayToken);

  useEffect(() => {
    onSolvedRef.current = onSolved;
  }, [onSolved]);

  useEffect(() => {
    if (lastReplay.current === replayToken) return;
    lastReplay.current = replayToken;
    setRun({ status: "idle" });
  }, [replayToken]);

  // Step-by-step playback: each timer shows the next state, then the result.
  useEffect(() => {
    if (run.status !== "running") return;
    const step = run.steps[run.index];
    const base = fast ? 190 : 470;
    const delay = step.kind === "start" ? 260 : step.kind === "check" ? base * 0.6 : base;
    const timer = window.setTimeout(() => {
      if (run.index + 1 < run.steps.length) {
        setRun({ ...run, index: run.index + 1 });
        return;
      }
      setRun({ ...run, status: "finished" });
      if (run.result.outcome === "success") onSolvedRef.current(starsForBlocks(run.blocksUsed, level.optimalBlocks));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [run, fast, level.optimalBlocks]);

  const start = () => {
    const result = runProgram(board, program);
    const blocksUsed = countBlocks(program);
    if (result.outcome === "empty") {
      setRun({ status: "finished", result, steps: result.steps, index: 0, blocksUsed });
      return;
    }
    const steps = result.outcome === "tooLong" ? result.steps.slice(0, MAX_ANIMATED_STEPS_WHEN_TOO_LONG) : result.steps;
    setRun({ status: "running", result, steps, index: 0, blocksUsed });
  };

  const reset = () => setRun({ status: "idle" });

  const changeProgram = (next: Block[]) => {
    setProgram(next);
    if (run.status !== "idle") setRun({ status: "idle" });
  };

  const current = run.status === "idle" ? null : run.steps[run.index];
  const robot = current?.state ?? startState(board);
  const running = run.status === "running";
  const finished = run.status === "finished" ? run : null;

  const trail = useMemo(() => {
    const visited = new Set<string>();
    if (run.status !== "idle") {
      for (let index = 0; index <= run.index; index += 1) visited.add(`${run.steps[index].state.x},${run.steps[index].state.y}`);
    }
    return visited;
  }, [run]);

  const effect: BoardEffect =
    finished?.result.outcome === "success" ? "win" : current?.kind === "bump" ? "bump" : current?.kind === "noGem" ? "noGem" : "none";

  const feedback = finished ? describeResult(finished.result, finished.blocksUsed, level.optimalBlocks) : null;

  const boardLabel =
    `Puzzle board, ${board.width} squares wide and ${board.height} tall. ` +
    `Bolt is on column ${robot.x + 1}, row ${robot.y + 1}, facing ${FACING[robot.dir]}. ` +
    `The flag is on column ${board.goal.x + 1}, row ${board.goal.y + 1}.` +
    (board.gems.length ? ` ${board.gems.length - robot.collected.length} of ${board.gems.length} gems left.` : "");

  return (
    <div className={styles.layout}>
      <section className={styles.stage} aria-label="Bolt's world">
        <PuzzleBoard board={board} robot={robot} world={world.id} trail={trail} effect={effect} effectKey={run.status === "idle" ? -1 : run.index} label={boardLabel} />

        <div className={styles.controls}>
          {running ? (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${styles.runButton}`} onClick={reset}>
              <span aria-hidden="true">■</span> Stop
            </button>
          ) : (
            <button type="button" className={`${ui.btn} ${ui.btnGo} ${styles.runButton}`} onClick={start}>
              <span aria-hidden="true">▶</span> Run
            </button>
          )}
          <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} onClick={reset} disabled={run.status === "idle"}>
            <span aria-hidden="true">↺</span> Reset
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`} aria-pressed={fast} onClick={() => setFast((value) => !value)}>
            <span aria-hidden="true">{fast ? "🐇" : "🐢"}</span> {fast ? "Fast" : "Normal"} speed
          </button>
        </div>

        <div className={`${styles.feedback} ${feedback ? (feedback.good ? styles.good : styles.bad) : ""}`}>
          <Mascot mood={feedback?.mood ?? (running ? "think" : "happy")} size={58} animated={false} />
          <div aria-live="polite" role="status" className={styles.feedbackText}>
            {feedback ? (
              <>
                <b>{feedback.title}</b>
                <p>{feedback.detail}</p>
              </>
            ) : running ? (
              <b>Bolt is following your program…</b>
            ) : (
              <>
                <b>Ready when you are!</b>
                <p>{level.goal} Build a program, then press Run.</p>
              </>
            )}
          </div>
          {running && current && current.action > 0 && (
            <span className={styles.stepBadge} aria-hidden="true">
              Step {current.action}
            </span>
          )}
        </div>

        <div className={styles.hints}>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSoft} ${ui.btnSmall}`}
            onClick={() => setHintsShown((count) => Math.min(count + 1, level.hints.length))}
            disabled={hintsShown >= level.hints.length}
          >
            <span aria-hidden="true">💡</span> {hintsShown === 0 ? "Need a hint?" : hintsShown < level.hints.length ? "Another hint" : "No more hints"}
          </button>
          {hintsShown > 0 && (
            <ol className={styles.hintList} aria-live="polite">
              {level.hints.slice(0, hintsShown).map((hint, index) => (
                <li key={index}>
                  <RichText text={hint} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <ProgramEditor
        program={program}
        onChange={changeProgram}
        palette={level.palette}
        newBlocks={level.newBlocks}
        locked={running}
        activeBlockId={running ? (current?.blockId ?? null) : null}
        activeSensed={running && current?.kind === "check" ? (current.sensed ?? null) : null}
        failedBlockId={finished?.result.failedBlockId ?? null}
        optimalBlocks={level.optimalBlocks}
      />
    </div>
  );
}
