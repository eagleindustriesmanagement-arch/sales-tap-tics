"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The fixed action bar at the bottom of a screen (Start, Send, See debrief). It measures itself and leaves exactly
 * that much room in the page, so nothing above it can sit underneath it: a mobile check (October 4) found the bar
 * covering half a button and winning the tap on a radio above it. It also sets --bottom-bar-h, which keeps focused
 * and scrolled-to controls clear of it (globals.css, scroll-padding-bottom).
 */
export function BottomBar({ children }: { children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const measure = () => {
      setHeight(el.offsetHeight);
      document.documentElement.style.setProperty("--bottom-bar-h", `${el.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--bottom-bar-h");
    };
  }, []);
  return (
    <>
      {/* Before the first measure (server render) a generous guess, so the first paint never overlaps either. */}
      <div aria-hidden="true" data-testid="bottom-bar-space" style={{ height: (height ?? 240) + 24 }} />
      <div ref={bar} data-testid="bottom-bar" className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-30 pt-3">
        {children}
      </div>
    </>
  );
}
