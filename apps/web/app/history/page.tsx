import Link from "next/link";
import { listSessions } from "@taptics/db";
import { t } from "@taptics/i18n";
import { IconClock, IconLock } from "@/components/icons";
import { Empty, ListRow, PageHeader, RowGroup, ScoreBadge, WarmUpTag, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

/** Every session the rep ran, newest first, with the score and how the customer left. */
export default async function History() {
  const user = await requireUser();
  const lang = await language();
  const sessions = await asUser(principalOf(user), (db) => listSessions(db, { userId: user.id }));
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  const now = new Date();
  return (
    <div className="space-y-5">
      <PageHeader title={t("history.title", lang)} back={{ href: "/progress", label: t("progress.title", lang) }} />
      {sessions.length === 0 ? (
        <Empty icon={<IconClock size={22} />} action={<Link href="/today" className={buttonClass}>{t("today.practiceNow", lang)}</Link>}>{t("history.empty", lang)}</Empty>
      ) : (
        <RowGroup>
          {sessions.map((s) => {
            // Someone practicing alone shares with no one: "private until" would promise a reveal that never comes.
            const isPrivate = user.accountKind !== "individual" && s.privateUntil && new Date(s.privateUntil) > now;
            return (
              <ListRow
                key={s.id}
                href={`/history/${s.id}`}
                title={library().scenarios.get(s.scenarioCode)?.title[lang] ?? s.scenarioCode}
                subtitle={<>{fmt.format(new Date(s.startedAt))} · {s.endReason ? t(`endReason.${s.endReason}` as "endReason.sale", lang) : t("history.inProgress", lang)}{isPrivate && <span className="mt-0.5 flex items-center gap-1"><IconLock size={13} />{t("history.private", lang, { time: fmt.format(new Date(s.privateUntil!)) })}</span>}</>}
                trailing={s.mode === "warm_up" && s.total !== null ? <WarmUpTag label={t("warmup.listLabel", lang)} /> : <ScoreBadge total={s.total} partial={s.partial} />}
              />
            );
          })}
        </RowGroup>
      )}
    </div>
  );
}
