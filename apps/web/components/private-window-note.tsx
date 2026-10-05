import { t, type Language } from "@taptics/i18n";
import { IconLock } from "@/components/icons";

/**
 * Why a manager's counts can read lower than Usage (spec 3.3): a session stays private to the rep for the store's
 * private window and only then reaches these screens. Nothing to say when the store has no window.
 */
export function PrivateWindowNote({ hours, lang }: { hours: number; lang: Language }) {
  if (!(hours > 0)) return null;
  return (
    <p className="flex items-start gap-1.5 px-1 text-[14px] text-muted" data-testid="private-window-note">
      <IconLock size={14} className="mt-[3px] shrink-0" />
      <span>{t("manager.privateWindowNote", lang, { hours })}</span>
    </p>
  );
}
