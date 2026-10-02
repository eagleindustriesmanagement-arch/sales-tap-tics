import { personalSettings } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** Settings (spec 18.1): language, reminder time, the store's private window, sign out. */
export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const lang = await language();
  const { reminderTime } = await asUser(principalOf(user), (db) => personalSettings(db, user.id));
  const { saved } = await searchParams;
  const other = lang === "en" ? "es" : "en";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("settings.title", lang)}</h1>
      {saved === "1" && <p role="status" className="font-semibold text-good">{t("settings.saved", lang)}</p>}
      {saved === "0" && <p role="alert" className="font-semibold text-bad">{t("settings.invalid", lang)}</p>}
      <Card className="space-y-2">
        <h2 className="font-bold text-ink">{t("settings.language", lang)}</h2>
        <p>{t("settings.languageNow", lang)}</p>
        <form action="/api/language" method="post">
          <input type="hidden" name="lang" value={other} />
          <button className="min-h-12 rounded-xl border border-line px-4 font-semibold text-ink" lang={other}>{t("language.switch", lang)}</button>
        </form>
      </Card>
      <Card>
        <form action="/api/settings" method="post" className="space-y-2">
          <label className="block font-bold text-ink" htmlFor="reminder">{t("settings.reminder", lang)}</label>
          <p className="text-sm text-muted">{t("settings.reminderHelp", lang)}</p>
          <input id="reminder" name="reminder" type="time" defaultValue={reminderTime ?? ""} className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink" />
          <button className={buttonClass}>{t("settings.save", lang)}</button>
        </form>
      </Card>
      <Card className="space-y-1">
        <h2 className="font-bold text-ink">{t("settings.privacy", lang)}</h2>
        <p data-testid="private-window">{user.privateWindowHours > 0 ? t("settings.privateWindow", lang, { hours: user.privateWindowHours }) : t("settings.noPrivateWindow", lang)}</p>
      </Card>
      <form action="/api/auth/logout" method="post">
        <button className="min-h-12 w-full rounded-xl border border-line px-4 font-semibold text-ink">{t("login.signOut", lang)}</button>
      </form>
    </div>
  );
}
