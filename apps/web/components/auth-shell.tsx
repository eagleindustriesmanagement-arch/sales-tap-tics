import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Language } from "@taptics/i18n";
import { LangSwitch } from "@/components/lang-switch";

/**
 * Sign-up and sign-in (decision 0028): on a phone, the form under a gold-lit header; on a wide screen, a showroom
 * panel beside it. The light behind the panel is CSS only and stops for reduced motion.
 */
export function AuthShell({ lang, eyebrow, title, intro, children, footer }: { lang: Language; eyebrow: string; title: string; intro: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="pt-safe grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="auth-stage relative hidden overflow-hidden lg:block" aria-hidden="true">
        <div className="auth-light" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src="/mark-128.png" alt="" width={40} height={40} className="bezel rounded-[11px]" />
            <span className="text-[19px] font-semibold tracking-tight text-ink">{t("app.name", lang)}</span>
          </div>
          <p className="font-display max-w-md text-[56px] leading-[1.02] text-ink">
            {t("auth.hero", lang)} <em className="text-brand">{t("auth.heroAccent", lang)}</em>
          </p>
          <p className="max-w-sm text-[15px] text-muted">{t("app.tagline", lang)}</p>
        </div>
      </aside>
      <div className="flex min-h-dvh flex-col px-5">
        <div className="mx-auto flex w-full max-w-md items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2 rounded-full pr-2 text-[16px] font-semibold text-ink lg:invisible">
            <img src="/mark-128.png" alt="" width={30} height={30} className="bezel rounded-[8px]" />
            {t("app.name", lang)}
          </Link>
          <LangSwitch lang={lang} />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 pb-10">
          <div className="space-y-3">
            <p className="text-[13px] font-semibold tracking-[0.18em] text-brand uppercase">{eyebrow}</p>
            <h1 className="font-display text-[44px] leading-[1.02] text-ink">{title}</h1>
            <p className="text-[16px] text-body">{intro}</p>
          </div>
          {children}
          {footer}
        </div>
        <p className="pb-safe mx-auto max-w-md pb-6 text-center text-[12px] text-muted">{t("app.disclaimer", lang)}</p>
      </div>
    </div>
  );
}
