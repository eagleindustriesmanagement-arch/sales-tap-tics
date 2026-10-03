import type { Metadata, Viewport } from "next";
import { t } from "@taptics/i18n";
import { isManager } from "@taptics/db";
import { AppChrome, type Tab } from "@/components/app-chrome";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Tap-tics",
  description: "Voice roleplay practice for car sales, in English and Spanish.",
  manifest: "/manifest.webmanifest",
  // The mark alone at tab sizes (the wordmark is unreadable below 64px); the full logo for home screens.
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon-64.png", sizes: "64x64", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Tap-tics", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the app draw under the notch and home indicator; the chrome insets itself.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await language();
  const other = lang === "en" ? "es" : "en";
  const user = await currentUser();
  const tab = (href: string, key: Parameters<typeof t>[0], icon: Tab["icon"]): Tab => ({ href, label: t(key, lang), icon });
  const tabs: Tab[] = !user
    ? []
    : user.roles.includes("general_manager")
      ? [tab("/manager/floor", "nav.floor", "floor"), tab("/manager/team", "nav.team", "team"), tab("/manager/dashboard", "nav.dashboard", "dashboard"), tab("/manager/store", "nav.store", "store")]
      : isManager(user)
        ? [tab("/manager/floor", "nav.floor", "floor"), tab("/manager/team", "nav.team", "team"), tab("/manager/compliance", "nav.compliance.view", "compliance")]
        : user.roles.includes("compliance_reviewer")
          ? [tab("/manager/compliance", "nav.compliance.view", "compliance"), tab("/manager/store", "nav.store", "store"), tab("/review", "nav.review", "review"), tab("/library", "nav.library", "library")]
          : user.roles.includes("content_editor")
            ? [tab("/review", "nav.review", "review"), tab("/library", "nav.library", "library")]
            : [tab("/", "nav.today", "today"), tab("/practice", "nav.practice", "practice"), tab("/progress", "nav.progress", "progress"), tab("/library", "nav.library", "library")];
  return (
    <html lang={lang}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-ink">
          {lang === "es" ? "Ir al contenido" : "Skip to content"}
        </a>
        <AppChrome
          tabs={tabs}
          appName={t("app.name", lang)}
          lang={lang}
          switchLabel={t("language.switch", lang)}
          otherLang={other}
          settingsLabel={t("nav.settings", lang)}
          initial={user ? (user.firstName?.[0] ?? "?").toUpperCase() : null}
        >
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
