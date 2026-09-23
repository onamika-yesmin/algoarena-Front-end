import Link from "next/link";

/**
 * The AlgoArena logo: a gradient tile holding a `</>` glyph, followed by the
 * wordmark. The tile's gradient lives in CSS (.brand-mark in globals.css)
 * rather than an SVG <defs>, so the same component can render twice on a
 * page — header and footer — without duplicating gradient element ids.
 *
 * `size="lg"` is the footer's larger treatment; the default is the header's.
 */

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.6 15.4 9.6 24l8 8.6" />
        <path d="M30.4 15.4 38.4 24l-8 8.6" strokeOpacity=".9" />
        <path d="M26.8 13.2 21.2 34.8" strokeOpacity=".78" />
      </svg>
    </span>
  );
}

interface BrandLogoProps {
  size?: "md" | "lg";
  href?: string;
  className?: string;
}

export function BrandLogo({ size = "md", href = "/", className }: BrandLogoProps) {
  return (
    <Link
      className={`brand${size === "lg" ? " brand-lg" : ""}${className ? ` ${className}` : ""}`}
      href={href}
      aria-label="AlgoArena home"
    >
      <BrandMark />
      <span className="brand-word">
        Algo<span>Arena</span>
      </span>
    </Link>
  );
}
