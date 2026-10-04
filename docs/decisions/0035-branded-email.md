# 0035: Every email looks like Sales Taptics, from one layout

- **Context.** The owner: every email a person gets must look consistently professional and on brand, the way
  BookFlows' emails do, but with Sales Taptics' own identity. The login code and the invite went out as bare plain
  text.
- **Decision.**
  - **One layout, `apps/web/lib/email/layout.ts`.** It uses the app's look (decision 0028): charcoal page and card,
    champagne-gold accents, warm ivory type, a serif heading, an "ST" monogram and the "Sales Taptics" wordmark set
    in type, and a footer with the tagline, the site and the copyright. A new email is a new `EmailContent` (subject,
    inbox preview, heading, paragraphs, an optional code panel or gold button, small print), never new HTML. The
    words live in `packages/i18n` under `email.*`, in English and Spanish.
  - **Built for inboxes, not browsers.** Tables and inline styles, no web fonts, and no images at all, so nothing is
    blocked or tracked and the brand shows with images off. The card is 560 px wide at most and tightens on a phone.
    It is dark by design: it declares `color-scheme: dark`, every dark surface is also a one-colour gradient (Gmail's
    app inverts colours but not images), and Outlook.com's dark mode is claimed back. Every word is HTML-escaped, and
    links must be http(s).
  - **Always a plain-text twin.** `sendEmail` sends the HTML and its plain text together, for text-only clients and
    for spam filters that compare the two.
  - **Messages so far:** the login code (the code is in the inbox preview, so a phone's notification shows it) and
    the invite (a gold "Sign in" button). Preview them with `pnpm --filter @taptics/web email:preview <dir>`.
- **Not verified here.** Real-client rendering (Gmail, Outlook, Apple Mail) has to be checked once the sending
  domain is verified at Resend; until then Resend refuses every send (decision 0029's graceful path still applies).
