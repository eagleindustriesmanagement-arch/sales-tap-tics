/**
 * Writes every Sales Taptics email, in English and Spanish, as HTML and text files to look at in a browser
 * (decision 0035). Usage: pnpm --filter @taptics/web email:preview [out-dir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inviteEmail, loginCodeEmail } from "../lib/email/messages";

const out = process.argv[2] ?? "email-preview";
const site = "https://salestaptics.com";
mkdirSync(out, { recursive: true });
for (const language of ["en", "es"] as const) {
  const emails = {
    "login-code": loginCodeEmail("482913", language, site),
    invite: inviteEmail({ name: "Carlos Méndez", store: "Kendall Toyota", language }, site),
  };
  for (const [name, e] of Object.entries(emails)) {
    writeFileSync(join(out, `${name}.${language}.html`), e.html);
    writeFileSync(join(out, `${name}.${language}.txt`), `Subject: ${e.subject}\n\n${e.text}`);
  }
}
console.log(`emails written to ${out}`);
