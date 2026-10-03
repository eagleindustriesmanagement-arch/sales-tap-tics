"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconBook, IconChart, IconClipboard, IconGlobe, IconHome, IconPath, IconShield, IconStore, IconUsers } from "@/components/icons";

export type TabIcon = "today" | "practice" | "progress" | "library" | "floor" | "team" | "dashboard" | "store" | "compliance" | "review";
export interface Tab { href: string; label: string; icon: TabIcon }

const ICONS: Record<TabIcon, (p: { size?: number }) => ReactNode> = {
  today: IconHome, practice: IconPath, progress: IconChart, library: IconBook, floor: IconClipboard,
  team: IconUsers, dashboard: IconChart, store: IconStore, compliance: IconShield, review: IconGlobe,
};

/** Screens that own the whole display: a live practice room, sign-in and the first-run notice. */
const immersive = (path: string) => /^\/practice\/[^/]+/.test(path) || path === "/login" || path === "/consent";

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

/**
 * The app frame (docs/DESIGN-GUIDELINES.md §7): a glass top bar with the language one tap away and the person's
 * settings behind their initial, and a floating glass tab bar in thumb reach. Practice is immersive: no tabs.
 */
export function AppChrome({ tabs, appName, lang, switchLabel, otherLang, settingsLabel, initial, children }: {
  tabs: Tab[]; appName: string; lang: string; switchLabel: string; otherLang: string; settingsLabel: string; initial: string | null; children: ReactNode;
}) {
  const path = usePathname() ?? "/";
  const full = immersive(path);
  return (
    <>
      {!full && (
        <header className="glass-chrome pt-safe sticky top-0 z-30">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full pr-2 font-bold text-ink" aria-label={appName}>
              <img src="/icon.svg" alt="" width={30} height={30} className="rounded-[9px]" />
              <span className="text-[17px] tracking-tight">{appName}</span>
            </Link>
            <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
              {tabs.map((t) => (
                <Link key={t.href} href={t.href} aria-current={active(path, t.href) ? "page" : undefined}
                  className={`rounded-full px-3.5 py-2 text-[15px] font-semibold ${active(path, t.href) ? "bg-brand-soft text-brand" : "text-ink"}`}>
                  {t.label}
                </Link>
              ))}
            </nav>
            <form action="/api/language" method="post" className="ml-auto">
              <input type="hidden" name="lang" value={otherLang} />
              <button className="liquid-glass liquid-glass-flat inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink" lang={otherLang}>
                <IconGlobe size={16} />{switchLabel}
              </button>
            </form>
            {initial !== null && (
              <Link href="/settings" aria-label={settingsLabel} className="liquid-glass liquid-glass-flat grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-ink">
                {initial}
              </Link>
            )}
          </div>
        </header>
      )}
      <main id="main" lang={lang} className={full ? "" : `mx-auto max-w-5xl px-4 pt-4 ${tabs.length ? "pb-tabbar lg:pb-12" : "pb-12"}`}>
        {children}
      </main>
      {!full && tabs.length > 0 && (
        <nav aria-label="Main" className="bottom-safe fixed inset-x-3 z-30 mx-auto max-w-md lg:hidden">
          <div className="liquid-glass grid h-[var(--tabbar-h)] items-stretch rounded-[1.75rem] p-1.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map((t) => {
              const on = active(path, t.href);
              const Icon = ICONS[t.icon];
              return (
                <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-[11px] font-semibold transition-colors ${on ? "bg-brand-soft text-brand" : "text-muted"}`}>
                  <Icon size={23} />
                  <span className="max-w-full truncate px-1">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
