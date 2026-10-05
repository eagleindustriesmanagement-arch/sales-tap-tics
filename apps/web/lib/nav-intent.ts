"use client";

/**
 * Where the rep last tapped to go, until that screen arrives. The update check reads it: a reload for a new release
 * that lands while a tap is still on its way goes to the tapped screen, not back to the old one, so the tap is never
 * lost (October 5: a first tap on "Team" seemed to do nothing and only the second worked).
 */
let target: string | null = null;

export const navIntent = {
  set(href: string | null) {
    target = href;
  },
  get(): string | null {
    return target;
  },
};
