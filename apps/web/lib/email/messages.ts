import { t, type Language } from "@taptics/i18n";
import { renderEmail, type RenderedEmail } from "./layout";

/** Each email Sales Taptics sends: its words only. The look is the shared layout's (decision 0035). */

export function loginCodeEmail(code: string, language: Language, siteUrl: string): RenderedEmail {
  return renderEmail({
    language,
    siteUrl,
    subject: t("login.emailSubject", language),
    preheader: t("email.code.preheader", language, { code }),
    heading: t("email.code.heading", language),
    paragraphs: [t("email.code.intro", language)],
    code: { label: t("email.code.label", language), value: code },
    note: t("email.code.note", language),
  });
}

export function inviteEmail(p: { name: string; store: string; language: Language }, siteUrl: string): RenderedEmail {
  const site = siteUrl.replace(/\/$/, "");
  return renderEmail({
    language: p.language,
    siteUrl: site,
    subject: t("invite.emailSubject", p.language, { store: p.store }),
    preheader: t("email.invite.preheader", p.language, { name: p.name, store: p.store }),
    heading: t("email.invite.heading", p.language, { store: p.store }),
    paragraphs: [t("email.invite.intro", p.language, { name: p.name, store: p.store }), t("email.invite.how", p.language)],
    action: { label: t("email.invite.action", p.language), url: `${site}/login` },
    note: t("email.invite.note", p.language, { name: p.name, store: p.store }),
  });
}
