import { t, type Language } from "@taptics/i18n";

/**
 * Every Sales Taptics email goes through this one layout (decision 0035), so each message a person gets looks like
 * the app: the showroom at night, champagne gold on charcoal, the same header and footer in both languages. A new
 * email is a new `EmailContent`, never new HTML.
 *
 * Email clients are not browsers: tables for layout, inline styles, no web fonts, no images (many inboxes block them,
 * and the wordmark is set in type so it always shows), and a plain-text part with the same words.
 */
export interface EmailContent {
  language: Language;
  subject: string;
  /** The inbox preview line shown next to the subject. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** A one-time code, shown large in a gold panel. */
  code?: { label: string; value: string };
  action?: { label: string; url: string };
  /** The small print under the message: why the person got it, or what to do if they did not ask for it. */
  note?: string;
  /** The site the footer links to, e.g. "https://salestaptics.com". */
  siteUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** The app's tokens (globals.css, decision 0028), as literal hex: email clients do not read CSS variables. */
export const BRAND = {
  page: "#0a0a0b",
  surface: "#151517",
  border: "#3a362f",
  ink: "#f6f1e7",
  body: "#d8d1c4",
  muted: "#a9a194",
  gold: "#dcc08c",
  goldFill: "#d6b47a",
  goldInk: "#16120b",
  goldSoft: "#2a2417",
} as const;

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Only web links go into an email: anything else (javascript:, data:) is refused. */
function safeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) throw new Error(`email link must be http(s): ${url}`);
  return escapeHtml(url);
}

/**
 * A fill that dark-mode clients leave alone: Gmail's app inverts plain background colours but not background images,
 * so each dark surface is also a one-colour gradient.
 */
const fill = (hex: string) => `background-color:${hex};background-image:linear-gradient(${hex},${hex});`;

export function renderEmail(c: EmailContent): RenderedEmail {
  const lang = c.language;
  const site = c.siteUrl.replace(/\/$/, "");
  const host = site.replace(/^https?:\/\//, "");
  const year = new Date().getUTCFullYear();
  const tagline = t("email.tagline", lang);

  const paragraphs = c.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${BRAND.body};">${escapeHtml(p)}</p>`)
    .join("");

  const code = c.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr><td align="center" bgcolor="${BRAND.goldSoft}" style="${fill(BRAND.goldSoft)}border:1px solid ${BRAND.gold};border-radius:14px;padding:22px 12px;">
          <p style="margin:0 0 8px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(c.code.label)}</p>
          <p class="st-code" style="margin:0;font-family:${MONO};font-size:36px;font-weight:700;letter-spacing:10px;color:${BRAND.gold};">${escapeHtml(c.code.value)}</p>
        </td></tr>
      </table>`
    : "";

  const action = c.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr><td align="center" bgcolor="${BRAND.goldFill}" style="${fill(BRAND.goldFill)}border-radius:999px;">
          <a href="${safeUrl(c.action.url)}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:16px;font-weight:700;color:${BRAND.goldInk};text-decoration:none;border-radius:999px;">${escapeHtml(c.action.label)}</a>
        </td></tr>
      </table>`
    : "";

  const note = c.note ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:13px;line-height:1.55;color:${BRAND.muted};">${escapeHtml(c.note)}</p>` : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(c.subject)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
  a { color:${BRAND.gold}; }
  @media (max-width: 600px) {
    .st-card { padding:28px 22px !important; }
    .st-heading { font-size:28px !important; }
    .st-code { font-size:30px !important; letter-spacing:7px !important; }
  }
  /* Outlook.com's dark mode rewrites colours unless they are claimed back. */
  [data-ogsc] .st-ink { color:${BRAND.ink} !important; }
  [data-ogsb] .st-page { background-color:${BRAND.page} !important; }
</style>
</head>
<body class="st-page" bgcolor="${BRAND.page}" style="margin:0;padding:0;${fill(BRAND.page)}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.page};">${escapeHtml(c.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" class="st-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="${fill(BRAND.page)}">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 6px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="34" height="34" align="center" valign="middle" bgcolor="${BRAND.goldSoft}" style="${fill(BRAND.goldSoft)}border:1px solid ${BRAND.gold};border-radius:10px;font-family:${SERIF};font-size:15px;font-weight:700;color:${BRAND.gold};">ST</td>
          <td style="padding-left:12px;font-family:${SANS};font-size:17px;font-weight:600;letter-spacing:-0.2px;color:${BRAND.ink};" class="st-ink">Sales Taptics</td>
        </tr></table>
      </td></tr>
      <tr><td class="st-card" bgcolor="${BRAND.surface}" style="${fill(BRAND.surface)}border:1px solid ${BRAND.border};border-radius:18px;padding:36px 34px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td width="44" height="2" bgcolor="${BRAND.gold}" style="${fill(BRAND.gold)}font-size:0;line-height:0;">&nbsp;</td></tr></table>
        <h1 class="st-heading st-ink" style="margin:0 0 18px;font-family:${SERIF};font-size:32px;font-weight:400;line-height:1.15;color:${BRAND.ink};">${escapeHtml(c.heading)}</h1>
        ${paragraphs}${code}${action}${note}
      </td></tr>
      <tr><td style="padding:24px 6px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${BRAND.muted};">
        <p style="margin:0 0 6px;font-family:${SERIF};font-size:15px;font-style:italic;color:${BRAND.gold};">${escapeHtml(tagline)}</p>
        <p style="margin:0;color:${BRAND.muted};"><a href="${safeUrl(site)}" target="_blank" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(host)}</a> &middot; &copy; ${year} Sales Taptics</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  // The plain-text part says the same thing, for clients that show no HTML and for spam filters that compare both.
  const text = [
    "Sales Taptics",
    "",
    c.heading,
    "",
    ...c.paragraphs.flatMap((p) => [p, ""]),
    ...(c.code ? [`${c.code.label}: ${c.code.value}`, ""] : []),
    ...(c.action ? [`${c.action.label}: ${c.action.url}`, ""] : []),
    ...(c.note ? [c.note, ""] : []),
    "--",
    `Sales Taptics · ${tagline}`,
    site,
  ].join("\n");

  return { subject: c.subject, html, text };
}
