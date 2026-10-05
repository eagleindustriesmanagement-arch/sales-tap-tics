# Spanish batch 3, part 2: sign-up, sign-in, invitations (for review, not merged)

Every line on the sign-in, sign-up, join and consent screens, and in the sign-in and invite emails, was checked
against the style guide (docs/spanish-style-guide.md) and the approved glossary. Six change.

| Key | English | Old Spanish | New Spanish | Reason |
| --- | --- | --- | --- | --- |
| invite.emailSubject | {store} added you to Sales Taptics | {store} lo agregó a Sales Taptics | {store} le dio acceso a Sales Taptics | "lo" assumes a man; guide 3.3: neutral phrasing when gender is unknown |
| email.invite.preheader | {name} added you to {store}. Sign in with this email address. | {name} lo agregó a {store}. Entre con este correo. | {name} le dio acceso al equipo de {store}. Entre con este correo. | Same: neutral |
| email.invite.intro | {name} added you to {store} on Sales Taptics, … | {name} lo agregó a {store} en Sales Taptics, … | {name} le dio acceso al equipo de {store} en Sales Taptics, … | Same: neutral |
| signup.invalidInput | Check the team name and the email address. (was "store name") | Revise el nombre de la tienda y el correo. | Revise el nombre del equipo y el correo. | The field above it is "Team or company name"; the error now names the field the person filled in (English fixed too) |
| login.demoHeading | Try the demo store | Pruebe el dealer de demostración | Pruebe la tienda de demostración | One name for one thing: the app calls the store "Tienda"; the product is for anyone who sells, not only dealers |
| login.orDemo | Just looking? Try the demo store, no email needed. | ¿Solo mirando? Pruebe el dealer de demostración, sin correo. | ¿Solo mirando? Pruebe la tienda de demostración, sin correo. | Same |

Kept on purpose:

- **"Entrar"** on the sign-in button, beside the title "Iniciar sesión" (glossary). The button is a short infinitive
  (guide 3.3); the title follows the glossary. Question for the reviewer below.
- **"No necesita un dealer"** (sign-up, "No dealership needed"). It is about dealerships, so "dealer" is right.
- **"Abrir mi tienda"** and **"Unirme al equipo"**. First-person buttons for the person's own action, by convention,
  like "Entiendo y acepto".

Questions for the Miami reviewer (not changed):

1. **Sign-in button.** Keep "Entrar", or use the glossary's "Iniciar sesión" on the button too?
2. **Consent text** ("…Usted y, después de su ventana privada de {hours} horas, sus gerentes las pueden ver…").
   "Ventana privada" follows the English "private window" closely. Not changed here: the consent wording is
   versioned (CONSENT_VERSION), and changing it asks every person to agree again, so it is the owner's call. A
   possible wording: "Usted las ve enseguida; sus gerentes, pasadas {hours} horas."
3. **Join screen** ("…ya está adentro, como vendedor"). "Vendedor" is the role name from the glossary; a woman
   joining reads the masculine. A neutral option: "…y entra al equipo con acceso de {role}."

All changed lines stay `spanish_reviewed: false` until a Miami reviewer approves them.
