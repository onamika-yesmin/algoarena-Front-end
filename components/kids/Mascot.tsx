import styles from "./Mascot.module.css";

export type MascotMood = "happy" | "cheer" | "think" | "oops";

const INK = "#1b2240";
const GLOW = "#6ff7e8";
const ORANGE = "#ff8c42";
const STEEL = "#5b6b8c";

interface MascotProps {
  mood?: MascotMood;
  /** Rendered width in px (height scales with it). */
  size?: number;
  animated?: boolean;
  /** Accessible name. Omit when the mascot is decorative. */
  title?: string;
  className?: string;
}

function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "cheer":
      return (
        <g>
          <path d="M70 84 Q81 68 92 84" stroke={GLOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M108 84 Q119 68 130 84" stroke={GLOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M82 93 Q100 118 118 93 Z" fill={GLOW} stroke={GLOW} strokeWidth="3" strokeLinejoin="round" />
        </g>
      );
    case "think":
      return (
        <g>
          <g className={styles.eyes}>
            <ellipse cx="88" cy="76" rx="8" ry="10" fill={GLOW} />
            <ellipse cx="124" cy="76" rx="8" ry="10" fill={GLOW} />
            <circle cx="91" cy="72" r="2.6" fill="#fff" />
            <circle cx="127" cy="72" r="2.6" fill="#fff" />
          </g>
          <path d="M90 101 Q101 97 114 102" stroke={GLOW} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "oops":
      return (
        <g>
          <circle cx="82" cy="79" r="10" fill={GLOW} />
          <circle cx="118" cy="79" r="10" fill={GLOW} />
          <circle cx="85" cy="75" r="3" fill="#fff" />
          <circle cx="121" cy="75" r="3" fill="#fff" />
          <ellipse cx="100" cy="102" rx="7" ry="8" fill="none" stroke={GLOW} strokeWidth="4.5" />
        </g>
      );
    default:
      return (
        <g>
          <g className={styles.eyes}>
            <ellipse cx="82" cy="79" rx="9" ry="11" fill={GLOW} />
            <ellipse cx="118" cy="79" rx="9" ry="11" fill={GLOW} />
            <circle cx="85" cy="75" r="3" fill="#fff" />
            <circle cx="121" cy="75" r="3" fill="#fff" />
          </g>
          <path d="M85 96 Q100 110 115 96" stroke={GLOW} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

/** Bolt, the Code Quest robot. Pure inline SVG with CSS animation (disabled for reduced motion). */
export function Mascot({ mood = "happy", size = 160, animated = true, title, className }: MascotProps) {
  const armsUp = mood === "cheer";
  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={Math.round(size * 1.1)}
      className={`${styles.mascot} ${styles[mood]} ${animated ? styles.animated : ""} ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <ellipse cx="100" cy="211" rx="54" ry="8" fill="rgba(27,34,64,0.18)" className={styles.shadow} />
      <g className={styles.body}>
        <line x1="100" y1="40" x2="100" y2="22" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <circle cx="100" cy="16" r="10" fill="#ffc83d" stroke={INK} strokeWidth="4" className={styles.bulb} />

        {armsUp ? (
          <g className={styles.arms}>
            <path d="M62 150 Q40 132 36 110" stroke={INK} strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M62 150 Q40 132 36 110" stroke={STEEL} strokeWidth="7" fill="none" strokeLinecap="round" />
            <circle cx="36" cy="104" r="10" fill={ORANGE} stroke={INK} strokeWidth="4" />
            <path d="M138 150 Q160 132 164 110" stroke={INK} strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M138 150 Q160 132 164 110" stroke={STEEL} strokeWidth="7" fill="none" strokeLinecap="round" />
            <circle cx="164" cy="104" r="10" fill={ORANGE} stroke={INK} strokeWidth="4" />
          </g>
        ) : (
          <g className={styles.arms}>
            <path d="M62 150 Q44 162 42 178" stroke={INK} strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M62 150 Q44 162 42 178" stroke={STEEL} strokeWidth="7" fill="none" strokeLinecap="round" />
            <circle cx="42" cy="182" r="10" fill={ORANGE} stroke={INK} strokeWidth="4" />
            <path d="M138 150 Q156 162 158 178" stroke={INK} strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M138 150 Q156 162 158 178" stroke={STEEL} strokeWidth="7" fill="none" strokeLinecap="round" />
            <circle cx="158" cy="182" r="10" fill={ORANGE} stroke={INK} strokeWidth="4" />
          </g>
        )}

        <rect x="68" y="184" width="24" height="20" rx="8" fill={STEEL} stroke={INK} strokeWidth="4" />
        <rect x="108" y="184" width="24" height="20" rx="8" fill={STEEL} stroke={INK} strokeWidth="4" />
        <rect x="58" y="132" width="84" height="60" rx="24" fill={ORANGE} stroke={INK} strokeWidth="5" />
        <path d="M105 143 L89 166 H101 L95 182 L113 157 H101 Z" fill="#ffc83d" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <rect x="88" y="124" width="24" height="12" rx="4" fill={STEEL} stroke={INK} strokeWidth="4" />

        <rect x="26" y="68" width="18" height="38" rx="9" fill={ORANGE} stroke={INK} strokeWidth="4" />
        <rect x="156" y="68" width="18" height="38" rx="9" fill={ORANGE} stroke={INK} strokeWidth="4" />
        <rect x="38" y="38" width="124" height="92" rx="36" fill="#f4f7ff" stroke={INK} strokeWidth="5" />
        <rect x="53" y="53" width="94" height="62" rx="26" fill={INK} />
        <ellipse cx="64" cy="102" rx="7" ry="4" fill="#ff7aa8" opacity="0.9" />
        <ellipse cx="136" cy="102" rx="7" ry="4" fill="#ff7aa8" opacity="0.9" />
        <Face mood={mood} />
        {mood === "oops" && <path d="M170 30 Q180 46 170 54 Q160 46 170 30 Z" fill="#8fd3ff" stroke={INK} strokeWidth="3" />}
      </g>
    </svg>
  );
}
