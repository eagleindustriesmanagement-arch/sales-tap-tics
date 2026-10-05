import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { IconShield } from "@/components/icons";
import { LangSwitch } from "@/components/lang-switch";
import { Card, buttonClass, titleClass } from "@/components/ui";
import { CONSENT_VERSION, currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

/** Spec 20.1: a plain notice in the rep's language, accepted at first sign-in and again when it changes. */
export default async function Consent() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.consentVersion === CONSENT_VERSION) redirect("/today");
  const lang = await language();
  return (
    <div className="pt-safe flex min-h-dvh flex-col px-5">
      <div className="mx-auto flex w-full max-w-md justify-end py-3"><LangSwitch lang={lang} /></div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 pb-10">
        <span className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-brand-soft text-brand ring-1 ring-brand/25 ring-inset"><IconShield size={32} /></span>
        <h1 className={titleClass}>{t("consent.title", lang)}</h1>
        <Card className="space-y-4">
          <p className="text-[16px] leading-relaxed text-ink">{/* Someone practicing alone has no managers: the notice says only what is true for them. */}
            {user.accountKind === "individual" ? t("consent.bodySolo", lang, { days: user.audioRetentionDays }) : t("consent.body", lang, { hours: user.privateWindowHours, days: user.audioRetentionDays })}</p>
          <p className="text-[13px] text-muted">{t("app.disclaimer", lang)}</p>
        </Card>
        <form action="/api/consent" method="post">
          <input type="hidden" name="lang" value={lang} />
          <button className={`${buttonClass} w-full`}>{t("consent.accept", lang)}</button>
        </form>
      </div>
    </div>
  );
}
