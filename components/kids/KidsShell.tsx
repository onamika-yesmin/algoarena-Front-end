"use client";

import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import ui from "./kidsUi.module.css";

/** Page frame for the Kids section: sign-in gate, the normal site header/footer, and the bright Code Quest canvas in between. */
export function KidsShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <main className={ui.shell}>
        <div className={ui.clouds} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={ui.container}>{children}</div>
      </main>
      <SiteFooter />
    </ProtectedRoute>
  );
}
