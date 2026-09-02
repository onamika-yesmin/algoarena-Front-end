// Small inline icons for homepage spotlight bullet lists and the header.

export function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Gems balance badge (site header — see SiteHeader.tsx). A simple faceted
// gem, filled with currentColor so a single color prop (the badge's own
// orange, distinct from the violet/cyan already used elsewhere in the
// header) is enough to theme it.
export function IconGem() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9Z" opacity="0.28" />
      <path d="M6 3h12l4 6H2Z" />
      <path d="M9 9h6l-3 12Z" />
    </svg>
  );
}
