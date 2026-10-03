import { loadStoreSetup } from "@taptics/db";
import { t } from "@taptics/i18n";
import { notFound } from "next/navigation";
import { StoreForm } from "@/components/store-form";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** Store setup wizard (spec 18.3): the general manager edits, the compliance reviewer signs off. */
export default async function StorePage() {
  const user = await requireUser({ roles: ["general_manager", "compliance_reviewer"] });
  const lang = await language();
  if (!user.storeId) notFound();
  const setup = await asUser(principalOf(user), (db) => loadStoreSetup(db, user.storeId!));
  if (!setup) notFound();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">{t("store.title", lang)}</h1>
        <p className="text-muted">{setup.storeName}</p>
        <p className="mt-1 text-sm">{t("store.intro", lang)}</p>
      </div>
      <StoreForm
        initial={{ ...setup, approvedAt: setup.approvedAt ? new Date(setup.approvedAt).toISOString() : null }}
        language={lang}
        canEdit={user.roles.includes("general_manager")}
        canApprove={user.roles.includes("compliance_reviewer")}
      />
    </div>
  );
}
