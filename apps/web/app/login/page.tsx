import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";
import { LangSwitch } from "@/components/lang-switch";
import { LoginForm } from "@/components/login-form";

/** Sign-in: the mark, one line of what this is, and a one-time code. Nothing else to read. */
export default async function Login() {
  if (await currentUser()) redirect("/");
  const lang = await language();
  return (
    <div className="pt-safe flex min-h-dvh flex-col px-5">
      <div className="mx-auto flex w-full max-w-md justify-end py-3"><LangSwitch lang={lang} /></div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 pb-10">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* The full logo carries the name and the "Learn · Improve · Close" line, so the heading is for screen readers. */}
          <img src="/logo.png" alt="" width={176} height={176} className="bezel rounded-[40px]" />
          <h1 className="sr-only">{t("app.name", lang)}</h1>
          <p className="text-[17px] text-body">{t("app.tagline", lang)}</p>
        </div>
        <div className="space-y-3">
          <h2 className="px-1 text-[19px] font-bold text-ink">{t("login.title", lang)}</h2>
          <LoginForm language={lang} />
        </div>
      </div>
      <p className="pb-safe mx-auto max-w-md pb-6 text-center text-[12px] text-muted">{t("app.disclaimer", lang)}</p>
    </div>
  );
}
