import { redirect } from "next/navigation";
import { t } from "@taptics/i18n";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";
import { LoginForm } from "@/components/login-form";

export default async function Login() {
  if (await currentUser()) redirect("/");
  const lang = await language();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("login.title", lang)}</h1>
      <p className="text-muted">{t("app.tagline", lang)}</p>
      <LoginForm language={lang} />
    </div>
  );
}
