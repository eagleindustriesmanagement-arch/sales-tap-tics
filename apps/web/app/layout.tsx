import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { t } from "@taptics/i18n";
import { isManager } from "@taptics/db";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Tap-tics",
  description: "Voice roleplay practice for car sales, in English and Spanish.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b5cad" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await language();
  const other = lang === "en" ? "es" : "en";
  const user = await currentUser();
  const links: [string, string][] = !user
    ? []
    : user.roles.includes("general_manager")
      ? [["/manager/floor", t("nav.floor", lang)], ["/manager/team", t("nav.team", lang)], ["/manager/dashboard", t("nav.dashboard", lang)], ["/manager/store", t("nav.store", lang)]]
      : isManager(user)
        ? [["/manager/floor", t("nav.floor", lang)], ["/manager/team", t("nav.team", lang)], ["/manager/compliance", t("nav.compliance.view", lang)]]
        : user.roles.includes("compliance_reviewer")
          ? [["/manager/compliance", t("nav.compliance.view", lang)], ["/manager/store", t("nav.store", lang)], ["/review", t("nav.review", lang)], ["/library", t("nav.library", lang)]]
          : user.roles.includes("content_editor")
          ? [["/review", t("nav.review", lang)], ["/library", t("nav.library", lang)]]
          : [["/", t("nav.today", lang)], ["/practice", t("nav.practice", lang)], ["/history", t("nav.history", lang)], ["/library", t("nav.library", lang)]];
  return (
    <html lang={lang}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-surface focus:p-2">
          {lang === "es" ? "Ir al contenido" : "Skip to content"}
        </a>
        <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-bold text-ink">
              <img src="/icon.svg" alt="" width={28} height={28} />
              <span>{t("app.name", lang)}</span>
            </Link>
            <nav aria-label="Main" className="ml-auto hidden items-center gap-1 text-sm font-medium sm:flex">
              {links.map(([href, label]) => (
                <Link key={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-ink hover:bg-ground" href={href}>{label}</Link>
              ))}
            </nav>
            {user && (
              <form action="/api/auth/logout" method="post" className="ml-auto hidden sm:ml-0 sm:block">
                <button className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted hover:bg-ground">{t("login.signOut", lang)}</button>
              </form>
            )}
            <form action="/api/language" method="post" className="ml-auto sm:ml-0">
              <input type="hidden" name="lang" value={other} />
              <button className="min-h-11 rounded-lg border border-line px-3 text-sm font-medium text-ink hover:bg-ground" lang={other}>{t("language.switch", lang)}</button>
            </form>
          </div>
        </header>
        {/* Phones: thumb-reach tab bar (spec 18.4 rule 7). */}
        {links.length > 0 && <nav aria-label="Main" className={`fixed inset-x-0 bottom-0 z-10 grid ${["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"][links.length] ?? "grid-cols-4"} border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden`}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="flex min-h-14 items-center justify-center text-sm font-semibold text-ink">{label}</Link>
          ))}
        </nav>}
        <main id="main" className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-24 text-xs text-muted sm:pb-10">{t("app.disclaimer", lang)}</footer>
      </body>
    </html>
  );
}
