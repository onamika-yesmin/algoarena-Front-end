import type { Board, RobotState } from "@/lib/kids/puzzleEngine";
import type { WorldId } from "@/lib/kids/types";
import styles from "./PuzzleBoard.module.css";

export type BoardEffect = "none" | "bump" | "noGem" | "win";

interface PuzzleBoardProps {
  board: Board;
  robot: RobotState;
  world: WorldId;
  /** "x,y" keys of squares Bolt has visited this run. */
  trail: ReadonlySet<string>;
  effect: BoardEffect;
  /** Changing this restarts the robot's effect animation. */
  effectKey: number;
  label: string;
}

const DIRECTION_TURNS = { N: 0, E: 1, S: 2, W: 3 } as const;

function WallArt({ world }: { world: WorldId }) {
  if (world === "lagoon") {
    return (
      <svg viewBox="0 0 40 40" className={styles.art} aria-hidden="true">
        <path d="M4 15q4-4 8 0t8 0 8 0 8 0" fill="none" stroke="#e8f8ff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M4 27q4-4 8 0t8 0 8 0 8 0" fill="none" stroke="#bfe9ff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (world === "caves") {
    return (
      <svg viewBox="0 0 40 40" className={styles.art} aria-hidden="true">
        <polygon points="5,35 11,16 17,21 21,5 29,18 35,35" fill="#8b5cf6" stroke="#2e1a6b" strokeWidth="2.2" strokeLinejoin="round" />
        <polygon points="21,5 24,20 20,35 17,21" fill="#c4b0ff" opacity="0.9" />
        <circle cx="30" cy="11" r="1.8" fill="#fff" className={styles.sparkle} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className={styles.art} aria-hidden="true">
      <circle cx="13" cy="25" r="10" fill="#2f9e44" stroke="#1d5c2c" strokeWidth="2" />
      <circle cx="27" cy="25" r="10" fill="#2f9e44" stroke="#1d5c2c" strokeWidth="2" />
      <circle cx="20" cy="16" r="11" fill="#40c057" stroke="#1d5c2c" strokeWidth="2" />
      <circle cx="15" cy="14" r="2.4" fill="#ffe066" />
      <circle cx="25" cy="21" r="2.4" fill="#ff8fab" />
    </svg>
  );
}

function FlagArt({ waving }: { waving: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={styles.art} aria-hidden="true">
      <ellipse cx="18" cy="34" rx="11" ry="3.5" fill="rgba(27,34,64,0.2)" />
      <rect x="12" y="5" width="3.2" height="29" rx="1.6" fill="#1b2240" />
      <path d="M15 6h17l-5 6.5 5 6.5H15z" fill="#ff4d6d" stroke="#1b2240" strokeWidth="2" strokeLinejoin="round" className={waving ? styles.flagWave : undefined} />
    </svg>
  );
}

function GemArt({ collected }: { collected: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={`${styles.art} ${styles.gem} ${collected ? styles.gemGone : ""}`} aria-hidden="true">
      <path d="M12 9h16l6 8-14 16L6 17z" fill="#ff5fa2" stroke="#1b2240" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6 17h28M20 33l-5-16 5-8 5 8z" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.75" />
    </svg>
  );
}

function RobotToken() {
  return (
    <svg viewBox="0 0 40 40" className={styles.token} aria-hidden="true">
      <rect x="4.5" y="13" width="6" height="16" rx="2.5" fill="#5b6b8c" stroke="#1b2240" strokeWidth="1.8" />
      <rect x="29.5" y="13" width="6" height="16" rx="2.5" fill="#5b6b8c" stroke="#1b2240" strokeWidth="1.8" />
      <path d="M20 9V4" stroke="#1b2240" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="20" cy="3.6" r="2.6" fill="#ffc83d" stroke="#1b2240" strokeWidth="1.6" />
      <rect x="9" y="8.5" width="22" height="26" rx="9" fill="#ff8c42" stroke="#1b2240" strokeWidth="2.4" />
      <rect x="11.5" y="10.5" width="17" height="11" rx="5" fill="#1b2240" />
      <circle cx="16.4" cy="16" r="2.4" fill="#6ff7e8" />
      <circle cx="23.6" cy="16" r="2.4" fill="#6ff7e8" />
      <path d="M15.5 28h9" stroke="#ffc83d" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function PuzzleBoard({ board, robot, world, trail, effect, effectKey, label }: PuzzleBoardProps) {
  const turns = DIRECTION_TURNS[board.start.dir] + robot.spin;
  const cells = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const isWall = board.walls[y][x];
      const isGoal = board.goal.x === x && board.goal.y === y;
      const gemIndex = board.gems.findIndex((gem) => gem.x === x && gem.y === y);
      const visited = !isWall && trail.has(`${x},${y}`) && !(robot.x === x && robot.y === y);
      cells.push(
        <div key={`${x},${y}`} className={styles.cell}>
          <div className={`${styles.tile} ${isWall ? styles.wall : (x + y) % 2 === 0 ? styles.floor : styles.floorAlt}`}>
            {isWall && <WallArt world={world} />}
            {visited && <span className={styles.trail} />}
            {isGoal && <FlagArt waving={effect === "win"} />}
            {gemIndex !== -1 && <GemArt collected={robot.collected.includes(gemIndex)} />}
          </div>
        </div>,
      );
    }
  }

  return (
    <div className={`${styles.frame} ${styles[`world_${world}`] ?? ""}`} style={{ maxWidth: `${board.width * 86 + 28}px` }}>
      <div
        className={styles.board}
        role="img"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`, aspectRatio: `${board.width} / ${board.height}` }}
      >
        {cells}
        <div
          className={styles.robot}
          style={{ width: `${100 / board.width}%`, height: `${100 / board.height}%`, transform: `translate(${robot.x * 100}%, ${robot.y * 100}%)` }}
        >
          <div className={styles.robotSpin} style={{ transform: `rotate(${turns * 90}deg)` }}>
            <div key={effectKey} className={`${styles.robotBody} ${effect !== "none" ? styles[`effect_${effect}`] : ""}`}>
              <RobotToken />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
