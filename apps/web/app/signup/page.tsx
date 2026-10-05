import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await language()) === "es" ? "Empezar un piloto · Sales Taptics" : "Start a pilot · Sales Taptics" };
}

/** Sign-up (decisions 0029, 0032): a team or an individual, then the emailed code. */
export default async function Signup({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  if (await currentUser()) redirect("/today");
  // Two ways in (decision 0032): a team (the default) or an individual (?for=me, from "Just for me" and pricing).
  const initialKind = (await searchParams).for === "me" ? "individual" : "team";
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
      <SignupForm language={lang} initialKind={initialKind} />
    </AuthShell>
  );
}
