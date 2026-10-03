"use client";

import Link from "next/link";
import { useEffect } from "react";
import { t, type Language } from "@taptics/i18n";
import { IconAlert } from "@/components/icons";
import { buttonClass, ghostButtonClass } from "@/components/ui";
import { reportClientError } from "@/lib/client-error";

/** Any screen that fails to draw: reported (decision 0027), then the user can retry it or go back to Today. */
export default function ScreenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError("screen", error, error.digest), [error]);
  const lang: Language = typeof document !== "undefined" && document.documentElement.lang.startsWith("es") ? "es" : "en";
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div role="alert" className="w-full max-w-md space-y-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[1.1rem] bg-ground text-bad"><IconAlert size={28} /></span>
        <h1 className="text-[22px] font-bold text-ink">{t("error.title", lang)}</h1>
        <p className="text-[16px] text-body">{t("error.body", lang)}</p>
        <button type="button" className={`${buttonClass} w-full`} onClick={reset}>{t("error.retry", lang)}</button>
        <Link href="/today" className={`${ghostButtonClass} w-full`}>{t("nav.today", lang)}</Link>
      </div>
    </div>
  );
}
