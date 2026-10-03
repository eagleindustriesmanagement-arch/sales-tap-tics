import type { Language } from "@taptics/i18n";
import { LanguageToggle } from "@/components/language-toggle";

/** The language, one tap from anywhere, where the app frame is hidden (sign-in, consent): the same toggle as the frame. */
export function LangSwitch({ lang }: { lang: Language }) {
  return <LanguageToggle lang={lang} testId="auth-lang" />;
}
