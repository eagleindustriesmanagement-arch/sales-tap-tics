import { listPeople } from "@taptics/db";
import { t } from "@taptics/i18n";
import { PeopleManager } from "@/components/people-manager";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** Users (spec 18.3): invite, roles, deactivate. General manager only. */
export default async function People() {
  const user = await requireUser({ roles: ["general_manager"] });
  const lang = await language();
  const people = await asUser(principalOf(user), (db) => listPeople(db, user.storeId!));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("people.title", lang)}</h1>
      <p className="text-muted">{t("people.intro", lang)}</p>
      <PeopleManager language={lang} people={people} me={user.id} />
    </div>
  );
}
