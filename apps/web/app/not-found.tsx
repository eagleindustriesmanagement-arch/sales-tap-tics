import Link from "next/link";
import { t } from "@taptics/i18n";
import { IconSearch } from "@/components/icons";
import { buttonClass, ghostButtonClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

/** A wrong address: say so plainly and offer the two ways back. */
export default async function NotFound() {
  const lang = await language();
  const signedIn = Boolean(await currentUser());
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-[1.25rem] bg-brand-soft text-brand"><IconSearch size={30} /></span>
        <p className="text-[13px] font-semibold tracking-[0.18em] text-brand uppercase">404</p>
        <h1 className="font-display text-[40px] leading-[1.05] text-ink">{t("notFound.title", lang)}</h1>
        <p className="text-[16px] text-body">{t("notFound.body", lang)}</p>
        <div className="grid gap-2 pt-2">
          <Link href={signedIn ? "/today" : "/"} className={`${buttonClass} w-full`}>{t(signedIn ? "nav.today" : "notFound.home", lang)}</Link>
          {!signedIn && <Link href="/login" className={`${ghostButtonClass} w-full`}>{t("login.title", lang)}</Link>}
        </div>
      </div>
    </div>
  );
}
