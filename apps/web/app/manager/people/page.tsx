import { listPeople } from "@taptics/db";
import { t } from "@taptics/i18n";
import { PeopleManager } from "@/components/people-manager";
import { PageHeader } from "@/components/ui";
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
      <PageHeader title={t("people.title", lang)} subtitle={t("people.intro", lang)} />
      <PeopleManager language={lang} people={people} me={user.id} />
    </div>
  );
}
