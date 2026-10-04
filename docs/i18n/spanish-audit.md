# Spanish audit (step 1 of the localization guide)

October 4, 2026. Against `docs/spanish-style-guide.md` and `packages/i18n/glossary.yaml`. Nothing has been changed yet:
the guide asks for this audit before any code or Spanish changes. Raw findings: `spanish-audit-data.md`.

## Scope

8,772 Spanish strings checked: 672 interface strings (`packages/i18n/src/strings.ts`), 243 on the public home and
pricing pages, and 7,857 in the content library (80 scenarios, 80 personas, 35 lessons, 122 techniques, 65
objections, rules and behavior cards). Plus the AI prompts, how text is assembled in code, and number and date
formatting.

## What is already right

- **Register:** usted throughout the interface and in reps' lines. No tú in the interface.
- **Vocabulary:** no Spain-only words (coche, ordenador, móvil, vosotros, aparcar, "vale" for okay).
- **Punctuation:** every question and exclamation opens with ¿ or ¡.
- **Formatting:** dates and numbers go through `Intl` with `es-US`; money keeps the U.S. form ($38,450).
- **Speech:** numbers and money are converted to Spanish words before speech ("treinta y ocho mil cuatrocientos
  cincuenta dólares").
- **Text from code:** English and Spanish live side by side under one key, and CI fails if either is missing.
  Nothing is machine-translated at runtime. Almost no sentence is glued from pieces: the only case is an
  accessibility label joining two labels with "/".
- **Review flags:** every content file carries `spanish_reviewed: false`, as the guide requires.

## What needs work

### A. Code (guide step 2), before any rewriting

1. **No plural rules.** `t()` only fills `{placeholders}`, so about 15 interface strings read wrong for a count of 1,
   in both languages: "Quedan 1 turnos", "1 días seguidos", "1 sesiones esta semana", "hace 1 días", "1 intentos",
   "1 resultados", "Registrado en 1 segundos". Fix: ICU plural support in `t()` (`{n, plural, one {…} other {…}}`)
   and convert those keys.
2. **No context notes on keys.** A writer cannot tell a "Close" button from the sales close. Fix: a short
   `context` note per key, starting with the ambiguous ones.
3. **Hard-coded English for screen readers.** `aria-label="Evidence grade"` (library) and `aria-label="Main"` (app
   navigation) are read aloud in English in Spanish mode.
4. **No guard against new hard-coded text.** Fix: a check that fails CI when a screen renders raw English text or an
   English `aria-label`.
5. **No pseudo-localization pass.** Text-overflow risk is untested beyond screenshots at two widths. Fix: one run
   with every string padded 35% to catch truncation and anything left untranslated.

### B. Terminology: the glossary differs from today's words (needs your decision; two are marked "confirm")

| Term | Today | Glossary | Where |
| --- | --- | --- | --- |
| Settings | Ajustes | Configuración | Settings page title |
| Floor check | chequeo (en el piso) | Revisión en el piso *(confirm)* | Floor mode, coaching, dashboard: 8 interface strings, 1 on the home page |
| Behavior card | tarjeta (de comportamiento / de conducta) | Meta de la semana *(confirm)* | Today, Progress, dashboard, Floor mode: about 9 strings (in the content, "tarjeta" is a business card and stays) |
| Assignment | Asignación | Tarea asignada | Team, Today |
| Debrief | Resumen | Resumen de la sesión | Debrief title; "Ver resumen" and 3 other mentions can stay short |
| Try again (button) | Intentar de nuevo | Volver a intentar | Error screen button |
| Roleplay | role-play | Simulación *(confirm)* | 9 lines on the home and pricing pages |

### C. Wording a reviewer should look at

- "Dale" (tú imperative) in three deliberately bad example lines (T026, T031, T087). It may be on purpose, as part of
  what makes them bad, but it is a register slip.
- The words the content authors already flagged for native review: `docs/content/industry-packs-review-notes.md`
  and `docs/content/release-2-review-notes.md`.

### D. AI prompts (guide step 6)

The customer prompt is written in English and says "Speak natural Miami Spanish", with the glossary as a list. The
guide wants the Spanish instructions written in Spanish, with the style guide's rules and three example exchanges
from section 5.2, so the model writes natively rather than translating from an English frame. The judge and unlock
prompts read Spanish, so they need the glossary but no style examples.

## What the checks cannot tell

Whether the Spanish *sounds native*. The scan catches mechanical problems; reading every line aloud is the reviewer's
job (guide section 7). Every rewritten line will stay `spanish_reviewed: false` until a Miami reviewer approves it.

## Proposed order (each batch shown as key | English | old Spanish | new Spanish | reason, merged only after approval)

1. **Code (A1 to A5).** Plurals, context notes, the two labels, the CI guard and one pseudo-localization run. No
   wording changes except the plural forms.
2. **Terminology (B)**, once you choose the terms.
3. **Interface rewrite, area by area:** navigation and buttons, onboarding (sign-up, sign-in, consent), the
   practice room, debriefs and scores, manager screens, notifications and emails.
4. **AI prompts (D)**, with the three Spanish example exchanges per prompt.
5. **Content**, scenario family by scenario family, with lines carrying prices, fees or conditions sent to
   compliance review as well.
