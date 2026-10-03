"use client";

import { useState } from "react";

/** Moving content needs a way to stop it (WCAG 2.2.2): pauses both rows of the objection rail. */
export function RailToggle({ pause, play }: { pause: string; play: string }) {
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        const next = !paused;
        setPaused(next);
        e.currentTarget.closest("[data-rail-root]")?.toggleAttribute("data-paused", next);
      }}
      className="mkt-rail-toggle liquid-glass liquid-glass-flat inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-ink"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false" fill="currentColor">
        {paused ? <path d="M3 1.5v11L12 7 3 1.5Z" /> : <><rect x="2.5" y="1.5" width="3" height="11" rx="1" /><rect x="8.5" y="1.5" width="3" height="11" rx="1" /></>}
      </svg>
      {paused ? play : pause}
    </button>
  );
}
