"use client";

/**
 * Where the rep last tapped to go, until that screen arrives. The update check reads it: a reload for a new release
 * that lands while a tap is still on its way goes to the tapped screen, not back to the old one, so the tap is never
 * lost (October 5: a first tap on "Team" seemed to do nothing and only the second worked).
 */
let target: { href: string; at: number } | null = null;

/** A tap older than this is no longer "on its way": it was superseded, redirected back, or failed. */
const FRESH_MS = 10_000;

export const navIntent = {
  set(href: string | null) {
    target = href ? { href, at: Date.now() } : null;
  },
  get(): string | null {
    return target && Date.now() - target.at < FRESH_MS ? target.href : null;
  },
};
