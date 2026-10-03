"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Screens that own the whole display and pin bars to it; they fade in without the rise (see globals.css motion). */
const immersive = (path: string) => /^\/practice\/[^/]+/.test(path) || ["/", "/login", "/signup", "/consent"].includes(path);

/**
 * Each route's content arrives with a short fade and rise (docs/DESIGN-GUIDELINES.md §6, motion). The animation is
 * CSS with `backwards` fill only: content is never left invisible, nothing stays transformed afterwards, and reduced
 * motion shows the page at once. Keyed by path so moving between screens under one segment animates too; a change
 * of query string (a library tab, a search) does not.
 */
export default function Template({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  return (
    <div key={path} className={immersive(path) ? "page-fade" : "page-enter"}>
      {children}
    </div>
  );
}
