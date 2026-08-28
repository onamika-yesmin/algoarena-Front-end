import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

export const metadata: Metadata = {
  title: "AlgoArena | Build your coding edge",
  description: "Practice problems, compete in live contests, and grow with AlgoArena.",
  applicationName: "AlgoArena",
  icons: { icon: "/icon.svg" },
  keywords: ["coding practice", "programming contests", "algorithm problems"],
  openGraph: {
    title: "AlgoArena | Build your coding edge",
    description: "Practice problems, compete in live contests, and grow with AlgoArena.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
