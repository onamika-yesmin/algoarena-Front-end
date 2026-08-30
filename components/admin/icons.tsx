// Small inline icon set for the admin dashboard — no icon library dependency,
// just plain SVGs sized to sit inline with text (sidebar nav, stat cards).

type IconProps = { className?: string };

const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconGrid({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconCode({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <polyline points="8 5 3 12 8 19" />
      <polyline points="16 5 21 12 16 19" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c0-4 3-6.4 6.5-6.4s6.5 2.4 6.5 6.4" />
      <path d="M16.2 4.3c1.7.5 3 2.1 3 4s-1.3 3.5-3 4" />
      <path d="M20 20c0-3-1.6-5.1-4-6" />
    </svg>
  );
}

export function IconTrophy({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 5.5M17 5h3a3 3 0 0 1-3 5.5" />
      <path d="M12 14v3" />
      <path d="M8.5 21h7" />
      <path d="M9.5 17.6h5l.7 3.4h-6.4l.7-3.4Z" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 10v4.2" />
      <path d="M12 17.3h.01" />
    </svg>
  );
}

export function IconInbox({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 12h4.8l1.6 3h5.2l1.6-3H21" />
      <path d="M5.2 5.5h13.6L21 12v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-6L5.2 5.5Z" />
    </svg>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...{ ...base, strokeWidth: 2 }} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
