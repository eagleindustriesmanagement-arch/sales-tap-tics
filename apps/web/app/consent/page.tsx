import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";
import { CONSENT_VERSION, currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

/** Spec 20.1: a plain notice in the rep's language, accepted at first sign-in and again when it changes. */
export default async function Consent() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.consentVersion === CONSENT_VERSION) redirect("/");
  const lang = await language();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("consent.title", lang)}</h1>
      <Card className="space-y-4">
        <p className="text-ink">{t("consent.body", lang, { hours: user.privateWindowHours, days: user.audioRetentionDays })}</p>
        <p className="text-sm text-muted">{t("app.disclaimer", lang)}</p>
        <form action="/api/consent" method="post">
          <input type="hidden" name="lang" value={lang} />
          <button className={`${buttonClass} w-full`}>{t("consent.accept", lang)}</button>
        </form>
      </Card>
    </div>
  );
}
