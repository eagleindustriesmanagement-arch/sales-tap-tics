"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navIntent } from "@/lib/nav-intent";

/**
 * Instant feedback on every tap that opens another screen: a thin gold bar along the top that runs while the server
 * prepares the next page and finishes when it arrives, and the tapped link dims and pulses until then. It never changes what the server answers (a refused or
 * missing page keeps its real status), unlike a route-level loading screen.
 */
export function NavProgress() {
  const path = usePathname();
  const query = useSearchParams();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapped = useRef<HTMLAnchorElement | null>(null);

  // A finished navigation: complete the bar, then hide it, and clear the tapped link's waiting look.
  useEffect(() => {
    setState((s) => (s === "running" ? "done" : s));
    tapped.current?.removeAttribute("data-pending");
    tapped.current = null;
    navIntent.set(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 320);
  }, [path, query]);

  // A tap on a link to another page of this site starts the bar.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (timer.current) clearTimeout(timer.current);
      setState("running");
      // The tapped link itself shows it is on its way (globals.css), where the finger and eye already are: the thin
      // bar at the top alone went unnoticed on a slow first load, and the tap was repeated.
      tapped.current?.removeAttribute("data-pending");
      a.setAttribute("data-pending", "");
      tapped.current = a;
      navIntent.set(url.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (state === "idle") return null;
  return <div aria-hidden="true" className={`nav-progress ${state === "done" ? "nav-progress-done" : ""}`} />;
}
