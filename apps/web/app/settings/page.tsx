import { personalSettings } from "@taptics/db";
import { t } from "@taptics/i18n";
import { IconBulb, IconClock, IconGlobe, IconLock } from "@/components/icons";
import { Avatar, Card, PageHeader, buttonClass, fieldClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { pushConfigured, vapidPublicKey } from "@/lib/push";
import { language } from "@/lib/server";
import { ReminderPush } from "@/components/reminder-push";

/** Settings (spec 18.1): language, reminder time, the store's private window, sign out. */
export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const lang = await language();
  const { reminderTime } = await asUser(principalOf(user), (db) => personalSettings(db, user.id));
  const { saved } = await searchParams;
  const other = lang === "en" ? "es" : "en";
  const icon = "grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand";
  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.title", lang)} />
      <Card className="flex items-center gap-3">
        <Avatar name={user.firstName ?? "?"} size={52} />
        <p className="text-[19px] font-bold text-ink">{user.firstName}</p>
      </Card>
      {saved === "1" && <p role="status" className="px-1 font-semibold text-good">{t("settings.saved", lang)}</p>}
      {saved === "0" && <p role="alert" className="px-1 font-semibold text-bad">{t("settings.invalid", lang)}</p>}
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={icon}><IconGlobe size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-ink">{t("settings.language", lang)}</h2>
            <p className="text-[14px] text-muted">{t("settings.languageNow", lang)}</p>
          </div>
          <form action="/api/language" method="post">
            <input type="hidden" name="lang" value={other} />
            <button className="liquid-glass liquid-glass-flat min-h-11 rounded-full px-4 text-[15px] font-semibold text-ink" lang={other}>{t("language.switch", lang)}</button>
          </form>
        </div>
      </Card>
      <Card>
        <form action="/api/settings" method="post" className="space-y-3">
          <div className="flex items-start gap-3">
            <span className={icon}><IconClock size={20} /></span>
            <div>
              <label className="block text-[16px] font-bold text-ink" htmlFor="reminder">{t("settings.reminder", lang)}</label>
              <p className="text-[14px] text-muted">{t("settings.reminderHelp", lang)}</p>
            </div>
          </div>
          <input id="reminder" name="reminder" type="time" defaultValue={reminderTime ?? ""} className={fieldClass} />
          <button className={`${buttonClass} w-full`}>{t("settings.save", lang)}</button>
        </form>
        {pushConfigured() && <div className="mt-3"><ReminderPush language={lang} publicKey={vapidPublicKey()!} /></div>}
      </Card>
      <Card className="flex items-start gap-3">
        <span className={icon}><IconLock size={20} /></span>
        <div>
          <h2 className="text-[16px] font-bold text-ink">{t("settings.privacy", lang)}</h2>
          <p className="text-[14px] text-body" data-testid="private-window">{user.privateWindowHours > 0 ? t("settings.privateWindow", lang, { hours: user.privateWindowHours }) : t("settings.noPrivateWindow", lang)}</p>
        </div>
      </Card>
      <form action="/api/auth/logout" method="post">
        <button className="liquid-glass liquid-glass-flat min-h-[52px] w-full rounded-full px-4 text-[17px] font-semibold text-bad">{t("login.signOut", lang)}</button>
      </form>
      <p className="flex gap-2 px-1 text-[12px] text-muted"><IconBulb size={14} className="mt-0.5 shrink-0" />{t("app.disclaimer", lang)}</p>
    </div>
  );
}
