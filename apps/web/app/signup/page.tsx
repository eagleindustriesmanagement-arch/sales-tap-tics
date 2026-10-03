import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

export const metadata: Metadata = { title: "Start a pilot · Sales Taptics" };

/** A dealership signs itself up (decision 0029): store name, first name, work email, then the emailed code. */
export default async function Signup() {
  if (await currentUser()) redirect("/today");
  const lang = await language();
  return (
    <AuthShell
      lang={lang}
      eyebrow={t("app.name", lang)}
      title={t("signup.title", lang)}
      intro={t("signup.intro", lang)}
      footer={
        <p className="text-center text-[15px] text-muted">
          {t("signup.haveAccount", lang)} <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">{t("login.title", lang)}</Link>
        </p>
      }
    >
      <SignupForm language={lang} />
    </AuthShell>
  );
}
