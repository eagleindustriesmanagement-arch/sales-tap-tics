import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { inviteLookup } from "@taptics/db";
import { t } from "@taptics/i18n";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { buttonClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { withClient } from "@/lib/db";
import { language } from "@/lib/server";

export const metadata: Metadata = { title: "Join your team · Sales Taptics", robots: { index: false } };

/** An invite link (decision 0032): whoever signs up here joins the manager's team, as the link's role. */
export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  if (await currentUser()) redirect("/today");
  const { token } = await params;
  const lang = await language();
  const invite = await withClient((db) => inviteLookup(db, token));
  if (!invite) {
    return (
      <AuthShell lang={lang} eyebrow={t("app.name", lang)} title={t("join.deadTitle", lang)} intro={t("join.deadLink", lang)}>
        <Link href="/" className={`${buttonClass} w-full`}>{t("notFound.home", lang)}</Link>
      </AuthShell>
    );
  }
  const role = t(invite.role === "manager" ? "role.manager" : "role.rep", lang).toLowerCase();
  return (
    <AuthShell
      lang={lang}
      eyebrow={t("app.name", lang)}
      title={t("join.title", lang, { team: invite.team })}
      intro={t("join.intro", lang, { role })}
      footer={
        <p className="text-center text-[15px] text-muted">
          {t("signup.haveAccount", lang)} <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">{t("login.title", lang)}</Link>
        </p>
      }
    >
      <SignupForm language={lang} invite={token} />
    </AuthShell>
  );
}
