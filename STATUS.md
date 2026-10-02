# Status

Updated 2026-10-02 (second pass). Build plan: spec section 22. Decisions: `docs/decisions/`. Plan: `docs/plans/`.

## What runs today

- **Text practice, end to end, in English and Spanish** (`apps/web`): pick the O01 "talk to my wife" scenario, watch
  the flawed and good demonstrations, talk to the customer, get a debrief with the critical issue first, the one
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
| M3 | 600-utterance labeled suite, zero critical false negatives | **Not started** (about 90 labeled cases so far) |
| M4 | 122 techniques, 65 objections as content | Done (imported from the spec) |
| M4 | 20 release 1 scenarios with personas | 1 of 20 |
| M4 | Spanish reviewed by a Miami native speaker | **Blocked on people**: every Spanish line is a draft (`spanish_reviewed: false`) |

## Numbers

- 180 unit and database tests: rules 93, engine 22, database 21 (row-level security, sign-in, repository),
  scoring 15, AI client 15 (fake SDK), i18n 8, session 6.
- 4 browser tests on the production build against Postgres (Pixel 7 viewport): rep sign-in, consent, practice,
  debrief and saved session; stop-on-critical with the violation stored; manager floor check and team view; a rep
  refused from manager screens, another rep's session and the floor-check API. Stable over 3 consecutive runs.
- Content CI: 0 errors; the compliance engine finds 0 critical violations across every model line, flawed line,
  demonstration, offline line and behavior-card line.

## Open risks

1. **Speech recognition on mixed Miami Spanish** is the largest technical risk (spec 11); nothing voice-related is
   proven yet.
2. **No attorney review.** Every rule runs at its strictest setting (spec 4.5); `attorney_reviewed: false` on all 26.
3. **Spanish drafts.** Technique names and "when" fields, objection "behind it" texts, persona and scenario lines,
   UI strings. Words to check first: "la mesa" vs "el desk", "recorrido" vs "walkaround", "autonomía" vs "rango",
   "clavo", "cartera de clientes", "socorrista".
4. **Equal points within a dimension** for universal rubric items are a placeholder (decision 0004); needs owner
   confirmation, then calibration against store outcomes.
5. **83 techniques have no source URL**; their evidence note names the source (often a book or trainer). The books
   in spec 23.1 are still to be obtained.
6. **Live-model latency and cost** are unmeasured until a key is configured.

## Not configured in this environment

- `ANTHROPIC_API_KEY`: the live Claude customer, classifier and judge are built and tested against a fake SDK only.
- `RESEND_API_KEY`: sign-in codes cannot be emailed yet; production refuses to sign anyone in until a delivery
  route exists.

## Next

1. Spec 22 M3: the rulebook test suite toward 600 labeled utterances, half Spanish; compliance reviewer flow.
3. M4: personas and scenarios for the remaining 19 release 1 objections.
4. Voice gateway with provider interfaces, once the bake-off candidates are chosen.
