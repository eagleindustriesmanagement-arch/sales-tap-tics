# Status

Updated 2026-10-02 (fourth pass). Build plan: spec section 22. Decisions: `docs/decisions/`. Plan: `docs/plans/`.

## What runs today

- **All 20 release 1 scenarios, in English and Spanish** (`apps/web`): pick any scenario (levels 1 to 3; floor,
  phone all-in quote, finance two-payment menu), watch the flawed and good demonstrations, talk to the customer, get a debrief with the critical issue first, the one
  change and its why, the turning point and the hidden truth. Phone-first layout, installable as a PWA.
- **Offline customer** when no `ANTHROPIC_API_KEY` is set: approved persona lines driven by the same engine. Its
  scores are marked partial (only engine and rule items are measurable), never a pass.
- **Live Claude customer, classifier, unlock detector and judge** when a key is set (Sonnet 5.5, Haiku 4.5,
  Opus 5.5; decision 0006). Not yet exercised against the real API from this environment.
- **Sign-in with a one-time code** (email or phone), consent notice at first sign-in, server-side role checks on
  every page and API route. Codes and session tokens are stored only as hashes; five codes per 15 minutes, five
  attempts per code; the endpoint does not reveal who has an account.
- **Everything is saved to Postgres** under row-level security: sessions (with the store's private window), every
  turn as it happens, engine events, violations, the immutable score, the debrief, model usage and cost, consent,
  and an audit entry whenever someone reads another person's session.
- **Weekly behavior card** issued when a rep finishes a session (lowest item of the week, weighted by evidence),
  shown on the rep's Today screen and in the manager's floor mode.
- **Floor mode** for managers from the database: this week's team cards grouped by behavior, the four-part script,
  yes/partly/no, note, the two self-checks, timed; writes the check and its coaching-quality row and closes the card.
- **Team view**: practice this week, average of complete scores, this week's card and status, critical flags,
  recent sessions; coaching quality (private to each manager, all managers for the general manager).
- **History**: the rep's saved sessions and debriefs; managers open team sessions from the team view.
- **Store setup** (general manager): fees, add-on removal policy, lenders, referral reward, bilingual text-consent
  wording, private window, audio retention, stop-on-critical, walk-in metric, languages, Spanish register. Any save
  clears the sign-off; only the compliance reviewer signs off. Practice uses the store's real dealer fees, and its
  removal policy only once signed off; until then the strictest rules apply.
- **Compliance view** (managers, general manager, compliance reviewer): flags by rule and by rep, and recent flags
  with the line, the true fact and a link to the session.
- **Practice plan** (spec 15): Today picks the next scenario and says why: manager assignment, a compliance
  failure to redo, onboarding (week 1 the first five objections, then one new objection a day), certification
  from day 30, or the skills most due for review (mastery-based spacing, nothing more than 10 days unpracticed).
- **Certification** (spec 15.4): fixed customers per scenario, stop on critical always on, pass at 70 with honesty,
  retry after 24 hours and a practice, valid 90 days; the team view counts each rep's certifications. Needs the
  live judge: offline scores are partial and cannot certify, and the app says so.
- **Assignments** (spec 14.5): a manager assigns a scenario to reps with a due date and a reason; it comes first on
  the rep's Today screen and is marked done when practiced.
- **Spanish review** (spec 16.3, decision 0010): the store's bilingual reviewer reads every Spanish line of the 20
  scenarios side by side with the English (897 lines) and approves or edits it; an edit is checked by the compliance
  engine before it is saved; lines with numbers also need the compliance reviewer. `pnpm --filter @taptics/db
  apply-reviews --tenant=<id>` writes approved edits back into the YAML (only the edited values change) and marks a
  file reviewed when every line is approved.
- **Coach the coach** (spec 14.3): managers practice a floor check and are scored on its four parts.
- **Library**: all 122 techniques and 65 objections with grade, evidence note, sources, both languages, search
  and grade filter.

## Milestone acceptance (spec 22.1)

| Milestone | Item | State |
| --- | --- | --- |
| M1 | Monorepo, TypeScript strict, CI | Done; CI green on every push |
| M1 | Tenant and store schema with row-level security | Done; cross-tenant tests on every tenant table pass against Postgres 16 |
| M1 | i18n package with bilingual completeness check | Done |
| M1 | Authentication | Done: one-time code sign-in, hashed sessions, rate limits, role checks (email delivery needs `RESEND_API_KEY`; SMS not yet) |
| M1 | Speech provider interfaces, two implementations each | **Not started**: waiting on the bake-off to choose candidates |
| M1 | Bake-off on consented Miami recordings | **Blocked on the store** (recordings, consent, provider keys) |
| M1 | Two-way spoken conversation under 1.5 s median | **Blocked** on provider keys |
| M2 | Content schemas and loader; O01 scenario with persona, facts, demos, rubric | Done |
| M2 | State machine: unlock, triggers, exit policy | Done; exit rates within 5 points over 100 runs (3 rep seeds), hidden truth never unlocked in 200 adversarial runs |
| M2 | Rule engine, PRICE/PAY/ADD/DEAD/CANCEL deterministic + classifier layer | Done; all 26 rules have a deterministic check where one is possible |
| M2 | Scoring deterministic and judge passes; debrief; behavior card | Done |
| M2 | Rep completes the scenario on a phone in under 15 minutes | Done in text mode (browser test at 390 px wide) |
| M2 | Debrief within 90 seconds | Offline: instant. Live judge: needs a key to measure |
| M5 | Floor check recorded in under 60 s on a phone; completion and timing on the general manager's view | Done (browser test on a Pixel 7 viewport records it in about a second) |
| M3 | 600-utterance labeled suite | Done: 689 cases (344 English, 345 Spanish) from four independent authors, dev/holdout split |
| M3 | Under 5% false positives, both languages | Met by the deterministic layer alone: 1.6% overall (English 1.5%, Spanish 1.7%; holdout 2.9%) |
| M3 | Zero critical false negatives | **Not met.** The deterministic layer misses 116 critical cases; the target is for both layers together, and the classifier needs `ANTHROPIC_API_KEY` (decision 0008) |
| M3 | Store setup wizard and compliance reviewer sign-off; compliance view | Done |
| M4 | 122 techniques, 65 objections as content | Done (imported from the spec) |
| M7 | Accessibility audit | Done: axe (WCAG 2.1 A and AA) passes on every main screen for every role, a live practice session and a debrief, in CI. It found and fixed low-contrast grey text and keyboard-unreachable scrolling tables |
| M7 | Dependency and secret scanning in CI | Done: `pnpm audit --prod` (no known vulnerabilities) and a secret scan of tracked files (proven to catch a planted key) |
| M7 | Prompt-injection tests | Done offline: the engine never unlocks on injections (200 sessions), and an obedient model's leak is blocked and replaced before it is spoken, in both languages. To repeat against the real model once a key is set |
| M7 | Load test, observability, cost dashboards, backup restore drill | **Not started** |
| M4 | 20 release 1 scenarios with personas | Done: 20 scenarios and personas; every one plays offline in both languages to its hidden truth and win with no critical violation, and its flawed demo never reaches the hidden truth (CI gate) |
| M4 | Every technique shows its grade, source and why | Done: all 122 have a "why" (67 honestly marked as tradition or weak evidence) and a flawed model line |
| M4 | Content editor with Spanish review workflow | Done for review (approve, edit with compliance check, numbers sign-off, write-back to YAML). Audio preview waits on the speech provider |
| M5 | Assignments | Done (row-level security: reps see their own; managers assign only to their reps) |
| M5 | Coach-the-coach roleplay | Done offline: the manager reads a scene, gives the floor check, and is scored on the four parts (the spec 14.2 example scores 100 in both languages); private to the manager, visible to the general manager. With a key, an AI rep reply can be added |
| M6 | Mastery tracking, spaced scheduling, certification with fixed seeds | Done; a simulated 30-day onboarding schedules all 20 objections and offers certification from day 30 |
| M6 | Quarterly recertification | Done: a fixed random set of 3 per rep and quarter, passed at 75, renews level 1 for 90 days |
| M6 | Reminders that respect peak hours | Timing done and tested (chosen time, once a day, moved past peak hours); **sending needs a push or SMS provider** |
| M4 | Spanish reviewed by a Miami native speaker | **Needs a person**: the review screen is ready; 0 of 897 release 1 lines reviewed |

## Numbers

- 348 unit and database tests: rules 116, session 99 (including the 20-scenario release gate and the 30-day
  simulation), engine 60, database 27 (row-level security, sign-in, repository, assignments, coaching practice,
  Spanish review), scoring 19, AI client 16 (fake SDK), i18n 8, content 3.
- 14 browser tests (9 flows and 5 accessibility audits) on the production build against Postgres (Pixel 7 viewport): rep sign-in, consent, practice,
  debrief and saved session; stop-on-critical with the violation stored; manager floor check and team view; a rep
  refused from manager screens, another rep's session and the floor-check API; the general manager edits store
  setup (a one-language consent text is refused), cannot sign it off, and the reviewer signs off and sees the flags;
  a manager assigns practice with a reason, the rep sees it first, practices it, and it shows done; certification
  is refused without the live judge and the team view counts certifications; a manager practices a floor check, a
  weak one scores 50 with the card's wording for what was missing, the spec example scores 100; the Spanish reviewer
  approves a line, an edit that invents a deadline is refused, and a line with an amount waits for and gets the
  compliance reviewer's sign-off.
- Compliance suite, deterministic layer (CI fails if any number gets worse):

  | Half | Cases | Violations missed | Critical missed | False positives |
  | --- | --- | --- | --- | --- |
  | Dev (tuned against) | 316 | 63 of 143 | 46 | 0 (0.0%) |
  | Holdout (never tuned) | 373 | 97 of 160 | 70 | 11 (2.9%) |

  Engine work on the dev half cut holdout false positives from 26 to 11, so those fixes generalize. Holdout misses
  only fell from 101 to 97: wider patterns catch what was seen, not new phrasings. Recall must come from the
  classifier layer.
- Content CI: 0 errors; the compliance engine finds 0 critical violations across every model line, flawed line,
  demonstration, offline line and behavior-card line.

## Open risks

1. **Speech recognition on mixed Miami Spanish** is the largest technical risk (spec 11); nothing voice-related is
   proven yet.
2. **No attorney review** (Ernesto's decision 0009: not a launch blocker for internal training). Every rule runs at
   its strictest setting. The rules were self-verified against their sources (`docs/compliance/rule-verification.md`:
   10 supported by law, 11 stricter house rules, 5 corrected), but the statute pages could not be fetched from this
   environment, so quoted wording rests on search excerpts. Revisit before any pilot whose output reaches customers.
3. **Spanish drafts.** Technique names and "when" fields, objection "behind it" texts, persona and scenario lines,
   UI strings. Words to check first: "la mesa" vs "el desk", "recorrido" vs "walkaround", "autonomía" vs "rango",
   "clavo", "cartera de clientes", "socorrista".
4. **Equal weights within each category** are confirmed (decision 0004) and are the robust choice without outcome
   data; re-fit against store outcomes once enough sessions exist.
5. **83 techniques have no source URL**; their evidence note names the source (often a book or trainer). The books
   in spec 23.1 are still to be obtained.
6. **Live-model latency and cost** are unmeasured until a key is configured.

## Not configured in this environment

- `ANTHROPIC_API_KEY`: the live Claude customer, classifier and judge are built and tested against a fake SDK only.
- `RESEND_API_KEY`: sign-in codes cannot be emailed yet; production refuses to sign anyone in until a delivery
  route exists.

## Needs a person

- **Case labels** are drafts until the compliance reviewer confirms them. The authors flagged
  their uncertain labels (for example: is a WhatsApp message a "text" under the consent rule? is a personal, live
  voicemail covered? does an ADD-04 disclosure need to come before the numbers?). The list is in
  `packages/rules/test/suite/README.md` under "Labels to confirm".

- **Spanish review** of the 19 new scenarios. Authors flagged Cuban-Miami choices to check: "gomas", "chapa",
  "coger de bobo", "parabrisas rajado", "me la paso dándole vueltas", "el lease".
- **Scenario facts not in the deal sheet:** two good demos state true general facts the scenario does not hold
  (the Equinox has more cargo room than the Trax; the LS and LT share the factory warranty). True for current
  models, but a reviewer should confirm or move them into the facts.

## Next

1. M3: run the suite with both layers (`pnpm compliance:suite --with-classifier`) once `ANTHROPIC_API_KEY` is set,
   and work the critical misses to zero on dev, reporting holdout.
2. M6: send reminders once a push or SMS provider is chosen; a setting for the rep's reminder time.
3. Content checks for technique lines run without scenario facts, so a technique's flawed line cannot demonstrate a
   fact-based violation (a price without the fee, an invented deadline). Checking them against a fixed example deal
   would let those lessons show the real violation.
4. Voice gateway with provider interfaces, once the bake-off candidates are chosen.
