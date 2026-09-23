// Small inline icons for the homepage sections and the site header. They all
// draw with `currentColor`, so the section that renders one decides its color.

interface IconProps {
  size?: number;
}

function Stroke({ size = 18, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Gems balance badge (site header — see SiteHeader.tsx). A simple faceted
// gem, filled with currentColor so a single color prop (the badge's own
// orange, distinct from the violet/cyan already used elsewhere in the
// header) is enough to theme it.
export function IconGem({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9Z" opacity="0.28" />
      <path d="M6 3h12l4 6H2Z" />
      <path d="M9 9h6l-3 12Z" />
    </svg>
  );
}

/** Judge / instant run. */
export function IconBolt({ size }: IconProps) {
  return <Stroke size={size}><path d="M13 2 4.5 13.2h6L11 22l8.5-11.2h-6L13 2Z" /></Stroke>;
}

/** Anything AI-assisted. */
export function IconSparkle({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="M12 3.2 13.9 9l5.8 1.9-5.8 1.9L12 18.6 10.1 12.8 4.3 10.9 10.1 9 12 3.2Z" />
      <path d="M18.8 3v3.2M20.4 4.6h-3.2" />
    </Stroke>
  );
}

/** Big-O / complexity auditor. */
export function IconGauge({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="M3.6 17a9 9 0 1 1 16.8 0" />
      <path d="m12 13.4 4-4.4" />
      <circle cx="12" cy="14.4" r="1.5" />
    </Stroke>
  );
}

/** Refactor recommendations. */
export function IconWand({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="m4 20 11-11" />
      <path d="m14.5 5.5 4 4" />
      <path d="M17.5 2.5 18.4 5l2.5.9-2.5.9-.9 2.5-.9-2.5L14.1 6l2.5-.9.9-2.6Z" />
    </Stroke>
  );
}

/** Analytics / progress. */
export function IconChart({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="M3 3v16.5a1.5 1.5 0 0 0 1.5 1.5H21" />
      <path d="m7 15 3.5-4 3 2.6L19 7" />
    </Stroke>
  );
}

/** Contests and rankings. */
export function IconTrophy({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
      <path d="M12 14v3.5M8.5 21h7M9.8 21c0-1.9.9-3.5 2.2-3.5s2.2 1.6 2.2 3.5" />
    </Stroke>
  );
}

/** Mock interview. */
export function IconMic({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </Stroke>
  );
}

/** Community feed. */
export function IconUsers({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.4A6.5 6.5 0 0 1 21 20" />
    </Stroke>
  );
}

/** Kids zone (block coding). */
export function IconBlocks({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
      <path d="M13 6.5h5a3 3 0 0 1 3 3V11M11 17.5H6a3 3 0 0 1-3-3V13" />
    </Stroke>
  );
}

/** Problem library. */
export function IconLibrary({ size }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" />
      <path d="M8.5 7.5h6M8.5 11h4" />
    </Stroke>
  );
}

export function IconArrow({ size = 16 }: IconProps) {
  return (
    <Stroke size={size}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Stroke>
  );
}

export function IconPlus({ size = 18 }: IconProps) {
  return <Stroke size={size}><path d="M12 5v14M5 12h14" /></Stroke>;
}
