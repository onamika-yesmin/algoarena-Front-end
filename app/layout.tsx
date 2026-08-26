import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoArena | Build your coding edge",
  description: "Practice problems, compete in live contests, and grow with AlgoArena.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
