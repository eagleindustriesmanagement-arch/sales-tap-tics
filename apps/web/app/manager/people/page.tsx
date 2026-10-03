import { listPeople } from "@taptics/db";
import { t } from "@taptics/i18n";
import { PeopleManager } from "@/components/people-manager";
import { Card } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** Users (spec 18.3): invite, roles, deactivate. General manager only. */
export default async function People({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser({ roles: ["general_manager"] });
  const welcome = (await searchParams).welcome === "1";
  const lang = await language();
  const people = await asUser(principalOf(user), (db) => listPeople(db, user.storeId!));
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">{t("people.title", lang)}</h1>
      {welcome && people.length === 1 ? (
        <Card className="space-y-2" data-testid="welcome">
          <h2 className="font-display text-[26px] leading-tight text-ink">{t("people.welcomeTitle", lang)}</h2>
          <p className="text-body">{t("people.welcomeBody", lang)}</p>
        </Card>
      ) : (
        <p className="text-muted">{t("people.intro", lang)}</p>
      )}
      <PeopleManager language={lang} people={people} me={user.id} />
    </div>
  );
}
