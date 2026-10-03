import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

/**
 * Sign-in with a one-time code. Real accounts first; the demo store (decision 0014) is the second path, and comes
 * first when the visitor arrived from "Try the demo" (?demo=1).
 */
export default async function Login({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  if (await currentUser()) redirect("/today");
  const lang = await language();
  const demoOn = process.env.TAPTICS_DEMO_LOGIN === "1";
  const demoFirst = demoOn && (await searchParams).demo === "1";
  return (
    <AuthShell
      lang={lang}
      eyebrow={t("app.name", lang)}
      title={demoFirst ? t("login.demoHeading", lang) : t("login.title", lang)}
      intro={demoFirst ? t("login.demoIntro", lang) : t("app.tagline", lang)}
      footer={
        <p className="text-center text-[15px] text-muted">
          {t("login.newStore", lang)} <Link href="/signup" className="font-semibold text-brand underline-offset-4 hover:underline">{t("login.startPilot", lang)}</Link>
        </p>
      }
    >
      <LoginForm
        language={lang}
        demoFirst={demoFirst}
        demo={demoOn
          ? [{ identifier: "rep@demo.test", label: t("login.demoRep", lang) }, { identifier: "manager@demo.test", label: t("login.demoManager", lang) }, { identifier: "gm@demo.test", label: t("login.demoGm", lang) }]
          : []}
      />
    </AuthShell>
  );
}
