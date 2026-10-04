"use client";

import { useRef } from "react";
import { t } from "@taptics/i18n";
import { IconGlobe } from "@/components/icons";

type Lang = "en" | "es";
const NAMES: Record<Lang, string> = { en: "English", es: "Español" };
const SHORT: Record<Lang, string> = { en: "EN", es: "ES" };

/**
 * The language picker, one treatment everywhere (the BookFlows header toggle, with the globe kept by request): a
 * compact glass pill that names the current language, "EN" on a phone and "English" from `sm` up, with a chevron.
 * A native select covers the whole pill, so a tap anywhere opens the device's own picker, and the keyboard and focus
 * stay on a real control; the pill's text is what shows. Choosing posts to /api/language, the same as before.
 */
export function LanguageToggle({ lang, className = "", testId }: { lang: Lang; className?: string; testId?: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action="/api/language" method="post" className={`shrink-0 ${className}`}>
      <label
        data-testid={testId}
        className="liquid-glass relative inline-flex h-11 w-[5.25rem] items-center gap-1.5 overflow-hidden rounded-full pr-2 pl-3 text-ink has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-brand sm:w-[8rem] sm:pl-3.5"
      >
        <span className="sr-only">{t("language.label", lang)}</span>
        <IconGlobe size={16} className="pointer-events-none shrink-0" />
        <span aria-hidden="true" className="pointer-events-none flex-1 truncate text-[14px] font-semibold">
          <span className="sm:hidden">{SHORT[lang]}</span>
          <span className="hidden sm:inline">{NAMES[lang]}</span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <select
          name="lang"
          value={lang}
          onChange={(e) => {
            if (e.target.value !== lang) form.current?.requestSubmit();
          }}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent text-transparent opacity-0"
        >
          {(["en", "es"] as const).map((l) => (
            <option key={l} value={l} lang={l}>{NAMES[l]}</option>
          ))}
        </select>
      </label>
    </form>
  );
}
