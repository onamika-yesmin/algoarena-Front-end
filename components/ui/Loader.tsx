// Shared loading indicators. Replaces plain "Loading…" text throughout the
// app with a real animated component (see globals.css for the keyframes).

import type { CSSProperties } from "react";

type LoaderSize = "sm" | "md" | "lg";

const DIAMETER: Record<LoaderSize, number> = { sm: 16, md: 24, lg: 40 };

export function Spinner({ size = "md", className = "" }: { size?: LoaderSize; className?: string }) {
  const diameter = DIAMETER[size];
  return (
    <span
      className={`aa-spinner ${className}`.trim()}
      style={{ width: diameter, height: diameter }}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Inline loader: a spinner plus a text label, for use inside cards/lists. */
export function Loader({ label = "Loading…", size = "md" }: { label?: string; size?: LoaderSize }) {
  return (
    <div className="aa-loader" role="status" aria-live="polite">
      <Spinner size={size} />
      <span>{label}</span>
    </div>
  );
}

/** Full-viewport loader for page-level/auth-gate loading states. */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="aa-page-loader" role="status" aria-live="polite">
      <Spinner size="lg" />
      <p>{label}</p>
    </main>
  );
}

/** Rectangular skeleton block for content placeholders (cards, rows, text lines). */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`aa-skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}
