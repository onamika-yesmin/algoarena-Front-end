import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";

// Rounded, friendly faces for the Kids section only. They're exposed as CSS
// variables (not applied here) so the shared site header keeps its own fonts;
// components/kids/kidsUi.module.css uses them with a full fallback stack.
const displayFont = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-kids-display", display: "swap" });
const bodyFont = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-kids-body", display: "swap" });

export const metadata: Metadata = {
  // Bare title, not "… | AlgoArena": the root layout's title template
  // appends the site name, so spelling it out here doubled it up.
  title: "Code Quest for Kids",
  description: "A playful coding adventure for ages 8–14: robot puzzles, loops and decisions, then real Python.",
};

export default function KidsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</div>;
}
