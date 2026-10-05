# 0037: Security headers on every response

- **Context.** Spec 20.2 asks for TLS everywhere and no provider calls from the browser, and the launch checklist
  (20.4) asks for the usual protections before a pilot. The app sent none of the standard security headers: any site
  could frame it, a script injected by a bug could load code or send data anywhere, and nothing told the browser to
  stay on HTTPS.
- **Decision.** `apps/web/next.config.ts` sends these on every response, pages and API alike:
  - **Content-Security-Policy.** Everything comes from this site: scripts, styles, fonts, images, media, requests,
    the service worker and the manifest. No framing (`frame-ancestors 'none'`), no plugins, no `<base>` or form posts
    elsewhere. Inline scripts and styles stay allowed: Next.js streams page data in inline scripts, and a nonce would
    need per-request middleware for little gain while every page already renders on the server. Media and images allow
    `data:` and `blob:` (the sound check's beep). Development adds `'unsafe-eval'` for fast refresh only.
  - **Strict-Transport-Security** for two years, for this host only: not subdomains (a service the owner adds later,
    such as email link tracking, may live on one) and not preloaded (both are hard to undo).
  - **X-Frame-Options: DENY** for browsers that predate `frame-ancestors`; **X-Content-Type-Options: nosniff**.
  - **Referrer-Policy: strict-origin-when-cross-origin**: an invite link carries its token in the path, and another
    site only ever sees our origin.
  - **Permissions-Policy**: the microphone for this site only (the practice room); no camera, location, payment or USB.
  - **Cross-Origin-Opener-Policy: same-origin.**
- **Proof.** A browser test checks the headers on a page, the sign-in page and the API, and that a script from
  another origin is refused. The regression sweep fails on any console error, which includes every policy violation,
  on every screen of every role in both languages: the policy breaks nothing the app does.
- **Consequences.** A future third-party script, font or API called from the browser must be added to the policy on
  purpose. Vercel's preview toolbar is blocked on previews (it loads from another origin); production does not use it.
