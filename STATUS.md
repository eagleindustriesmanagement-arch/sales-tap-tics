# Status

Updated 2026-10-05 (tenth pass, evening: six-persona verification blitz and its fixes). Before that: ninth pass, overnight: warm-up mode, security headers, cross-company integrity, the
honesty line enforced in content and scoring, debrief attribution). Previous: 2026-10-03 (teams and individuals,
admin access as a privilege, a home page that sells, pricing, industries). Build plan: spec section 22. Decisions: `docs/decisions/`. Plan: `docs/plans/`.

## What runs today

- **Verification blitz, evening October 5:** six persona passes (car owner, solar owner in Spanish, rookie rep,
  veteran rep in Spanish, an adversarial compliance probe, a solo seller). They ran against a local production
  build, not salestaptics.com, which this environment cannot reach, with no AI model: an offline customer and no
  judge. Fixed from them:
  - The practice room shows the numbers sheet.
  - A finished conversation is saved even if the rep closes the phone.
  - A booked next step survives ending by hand.
  - Assign practice is grouped by industry.
  - Private-window notes explain why manager counts lag Usage.
  - Solo accounts get no manager or store wording.
  - Non-car teams no longer see car certification counts or dealer-only store fields.
  - Spanish persona cues match without accents and in everyday Miami phrasing.
  - A payment quoted with its terms is not a bare anchor.
  - RATE-01 checks that a payment's term and down payment match the sheet (also in debrief suggestions).
  - About 35 Spanish strings and lines were rewritten.
  - Compliance engine, rep side:
    - Honest myth-busting about a three-day cancel window is no longer a critical.
    - These are now caught:
      - false "my manager already approved" claims;
      - trade values said with the vehicle's name;
      - wrong payoffs;
      - "0% financing";
      - denying the dealer fee;
      - "won't approve you without GAP";
      - an invented buyer coming to see this car;
      - a "same term" that hides the longer term.
    - RATE-01's tolerance is now 50 cents.
  - Customer guard:
    - The hidden ceiling no longer leaks through paraphrase.
    - An amount must fit its role (owed, offered, or a difference).
    - Rates and offer deadlines are checked against the facts.
    - Coaching cues are wider.
  - The compliance baseline is updated: dev critical misses 46 to 44, false positives 11 to 9.
  - Still open (offline customer only, the live model is unaffected):
    - The scripted customer can answer a turn late when the rep proposes a time on the turn the concern comes out.
  - Still open (content):
    - The technique library's example lines are car lines for every industry; a note says so.
    - "Me parece justo" and "lado a lado" remain in some customer lines and lessons, for the Spanish batch review.

- **Overnight October 5** (decisions 0034, 0037, 0038):
  - **Warm-up** (spec 12.5): an optional 3-minute drill on the rep's weakest behavior, from a card on Today; scored
    on that one behavior, never a pass, completion only for the manager.
  - **Security headers** on every response: a Content-Security-Policy that keeps everything on this site, HSTS,
    no framing, a strict referrer policy and the microphone for this site only.
  - **Cross-company integrity**: a browser test aims every id-taking API route at another company's records; it
    found that a manager could write a membership and an assignment naming another company's person (reads were
    always isolated). The database now refuses any row that ties one company's person or store to another.
  - **The honesty line**: twelve scenario conditions that described a lie but were filed as coaching now zero the
    attempt, and a content test keeps it so; without the live judge (offline or down) no score can pass; a judged
    lie on unclear audio is flagged for review instead of zeroing.
  - **Debrief**: "You said" on the turning point is always the rep's own line from the transcript; a placeholder
    the AI customer leaves ("la [SUV]") becomes the product's name.
  - **Hardening**: one turn at a time per session; a migration never blocks the app on a lock (it fails the deploy
    after 15 s instead); CI enforces spec 21.1's 80% line coverage (rules 86%, scoring 93%, content 93%, engine 96%);
    spec 21.4's English/Spanish fairness holds on all 80 customers, good and flawed, and a test keeps it so.

- **Learn, see it, do it, get scored** (decision 0031): each of the 20 certification scenarios opens with a lesson
  (the tactic, the psychology, when and when not, the exact words, the mistakes, the named moves scored), in English
  and Miami Spanish, 60 to 90 seconds of reading. Then the demonstration, then the role-play; the debrief names the
  lesson concept behind the one change and each scored behavior. Lessons are content
  (`packages/content/library/lessons/`), validated and compliance-checked; Spanish awaits a native review.
- **Public home page at `/` and pricing at `/pricing`** (decisions 0028, 0032): "Simple to use. Deep to learn."
  The hero names every high-ticket sale; a research strip (Rackham, Gong Labs, The JOLT Effect, negotiation
  research); the ROI section ("Trained sales floors sold 12% more per day", Prada, Rucci & Urzúa, IZA DP 12447,
  2019, with its caveat; CEB's "up to 19%" as a second figure) and a calculator labelled as an illustration; how it
  works in four steps; 122 techniques in 12 families with featured cards; industries; scoring and compliance;
  managers; Miami Spanish. Pricing has three per-seat tiers (Solo, Team, Dealership) with **placeholder prices** for
  Ernesto to set, a monthly/annual switch and an FAQ. **The 12% and 19% wording must be checked against the primary
  papers before launch** (sources in `docs/research/selling-sales-training.md`).
- **Teams and individuals** (decisions 0029, 0032): sign up at `/signup` "For my team" (the owner becomes the
  team's manager with admin access, then sends invite links from Team) or "Just for me" (an individual in any
  industry, rep screens only). Anyone who joins through `/join/<link>` lands on that team with the link's role;
  links are hashed, counted and can be turned off. **Admin access** is a switch on People, not a role. Every path
  uses an emailed code. "Try the demo" (`/login?demo=1`) is the second path. **Production needs `RESEND_API_KEY`
  for any real email.**
- **Industries** (decision 0033): homes, solar and furniture have five role-play customers each, with lessons, in
  English and Miami Spanish (Spanish unreviewed). A rep practices their own industry's customers first; car-only
  compliance rules (CANCEL-01, ADD-02, ADD-04, PRICE-02, PRICE-04) apply only to car sales; certification is the car
  path. Reviewer notes and six engine gaps the authors found: `docs/content/industry-packs-review-notes.md`.
- **One luxury theme across the app** (decision 0028): charcoal, champagne gold, ivory; Instrument Serif headlines;
  glass throughout; page transitions; an animated score reveal on the debrief. The logo is the owner's second version (green on near-black).
- **A customer for every objection: 65 scenarios** (decision 0017).
  - The 20 release 1 scenarios stay the **certification path**, by level.
  - **More customers:** one level 1 customer for each of the other 45 objections, grouped by topic (everyday
    objections; phone, payment and financing; the 2026 market; electric vehicles; language and trust; undecided
    customers).
  - Every one passes the release gate offline in both languages. Release 2 customers practice and never certify;
    the server refuses certification on them.
  - Each objection's library page has a "Practice this objection" button.
  - The reviewers' checklist for the 45 is in `docs/content/release-2-review-notes.md`: the Spanish words and
    real-world claims the authors flagged.
- **Objection weights from the store's lost-deal reasons** (spec 19.2 item 2, decision 0018).
  - Uploading lost-deal reasons maps each reason to objections, with a bilingual mapping kept as content.
  - "Talk to my spouse", "think it over" and "no time" count half; the other half goes to price, payment,
    financing and other stores.
  - The store's weights reorder onboarding after week 1, break ties between due reviews, and pick the next new
    customer once onboarding is done.
  - The store numbers page shows what is practiced first and the reasons that could not be matched.
- **Deploys are safe on a fresh, shared database** (decision 0025). Migrations, the demo seed and the content
  release each run in one transaction under a deploy lock, so Production and Preview can deploy to the same Supabase
  database at once, through its transaction pooler, from empty. CI rehearses exactly that on every push (a
  non-superuser owner, Supabase's roles, PgBouncer in transaction mode, two deploys at once). Locally, the full
  browser suite passed through the pooler. Supabase's own-CA certificates are verified through `DATABASE_CA_CERT`
  (decision 0026), never by turning verification off.
- **Practice and results** (spec 19.2 item 3, decision 0024). The Store numbers page relates each practice score
  to the reps' real close rate and add-ons kept, with sample sizes and a plain warning that correlation is not
  proof. It lists scores that relate to nothing as candidates for less weight, and waits for 5 reps with enough
  practice and ups.
- **Usage** (spec 19.4, decision 0020): an admin sees counts only, private windows included, with no
  rows, names or text:
  - sessions started and finished;
  - reps practicing this week and per day;
  - debriefs read, demos watched first, behavior cards checked;
  - invite to first session, and reps who never practiced;
  - spoken share, the pause before answering, recognition confidence by language;
  - AI cost per session and response time, by week.
- **Observability** (decision 0021):
  - structured JSON logs with no personal data or text;
  - every server error, through `onRequestError`;
  - each turn's time to the first customer sentence;
  - `/api/health` for uptime monitors.
- **Daily practice reminders by Web Push** (spec 15.3 item 5, decision 0022).
  - A rep turns them on for each phone in Settings.
  - An hourly job sends one reminder at the chosen time: never twice a day, never in the store's peak hours, and
    not if the rep already practiced.
  - The store's peak hours are a store setup field (default Saturday 11:00 to 17:00).
  - It is off until the deployment has VAPID keys, a `CRON_SECRET` and an hourly schedule (`docs/DEPLOY.md`).
- **Technique lines are checked against an example deal** (decision 0019). A model line can no longer state a
  number or deadline its deal does not hold, and the T020 and T107 flawed lines now show the made-up deadline their
  lesson is about.

- **Ready to host on Vercel at salestaptics.com** (decision 0014, `docs/DEPLOY.md`).
  - Deploys run from GitHub. Each build migrates, publishes the content and seeds the demo store before
    `next build`.
  - Neon Postgres. The full browser suite passes against a database owned by a non-superuser, as on Neon, and CI
    runs the deploy step that way on every push.
  - A turn that reaches a different server instance rebuilds the live session from its stored turns.
  - The trial sign-in offers one-tap demo roles with the code on screen.
- **The owner's logo** in the header, sign-in, favicons, home-screen and App Store icons (`docs/brand`). The UI
  blue comes from it.

- **The app, redesigned for phones** (decision 0012, `docs/DESIGN-GUIDELINES.md`). BookFlows' Liquid Glass material
  with the Sales Taptics blue and amber, light and dark. The rep flow is laid out like a learning app:
  - **Today:** the daily goal ring, the streak, the certified count, and one "Up next" card with one Start button.
  - **Practice:** a connected path by level, each scenario marked passed, certified, up next, tried or new.
  - **Session:** a full-screen briefing, then a chat-style conversation with a turns-left bar and a "customer is
    answering" indicator.
  - **Results:** the score ring, with the one change that matters most right under it.
  - **Progress:** its own tab, with the certification ring and skills by week.
  - **The frame:** a floating glass tab bar with icons, safe areas for the notch, and the language one tap away
    on every screen, sign-in included.
  - **Managers:** Team, Dashboard and Floor are phone-first lists and tiles instead of tables.
- **Hands-free voice practice** (decision 0013, device tier). The rep picks Talk or Type on the briefing; Talk is
  the default wherever the device can listen.
  - The customer speaks each sentence as soon as it clears the compliance guard, with numbers read the way a person
    says them in English and Spanish.
  - The turn ends when the rep pauses (700 ms in English, 850 ms in Spanish).
  - The rep can talk over the customer (their own echo is ignored) or tap to interrupt.
  - The pause before answering, the speaking rate and the recognizer's confidence are stored and scored. Numbers
    heard with low confidence are flagged for review, never failed.
  - The live screen shows the customer's avatar, a voice meter, a timer and "Show words".
  - A denied or missing microphone falls back to typing.
  - No per-minute speech cost. The cloud tier (mixed-language recognition, Miami voices) plugs in behind the same
    contracts after the bake-off.

- **All 20 release 1 scenarios, in English and Spanish** (`apps/web`): pick any scenario (levels 1 to 3; floor,
  phone all-in quote, finance two-payment menu), watch the flawed and good demonstrations, talk to the customer, get a debrief with the critical issue first, the one
  change and its why, the turning point and the hidden truth. Phone-first layout, installable as a PWA.
- **Offline customer** when no `ANTHROPIC_API_KEY` is set: approved persona lines driven by the same engine. Its
  scores are marked partial (only engine and rule items are measurable), never a pass.
- **Live Claude customer, classifier, unlock detector and judge** when a key is set (Sonnet 5.5, Haiku 5.5,
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
  recent sessions; coaching quality (private to each manager, all managers for an admin).
- **History**: the rep's saved sessions and debriefs; managers open team sessions from the team view.
- **Store setup** (admin): fees, add-on removal policy, lenders, referral reward, bilingual text-consent
  wording, private window, audio retention, stop-on-critical, walk-in metric, languages, Spanish register. Any save
  clears the sign-off; only the compliance reviewer signs off. Practice uses the store's real dealer fees, and its
  removal policy only once signed off; until then the strictest rules apply.
- **Compliance view** (managers, admins, compliance reviewer): flags by rule and by rep, and recent flags
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
- **Settings** (everyone, spec 18.1): language, daily reminder time, the store's private-window rule in plain words,
  and sign out (which phones could not reach before). Today shows the rep's practice streak.
- **Score flags** (spec 3.3 rule 4): a manager flags a rep's score with a reason (disagree, audio, scenario, other);
  the automated score never changes, the flag is permanent and the rep sees it next to the score.
- **Audit log and export** (admin): the audit log of session reads and changes to people, roles, store
  settings and scores (readable only by an admin); sessions and scores as CSV, safe to open in a
  spreadsheet.
- **Store dashboard** (admin, spec 18.3): certified for customers, reps practicing this week, floor-check
  completion over 4 weeks, critical flags, and sessions, reps, cards and flags by week; links to compliance,
  people and AI costs. The team view shows each rep's coaching focus (spec 14.4: middle performers first, extra
  practice for the lowest third, stretch goals for the top third).
- **Progress and rep detail** (spec 18.1, 18.2): certification count, complete-score dimensions by week for 8
  weeks, weakest skills, mastery by objection, and behavior cards with the floor-check result. The rep sees their
  own; a manager opens any of their reps from the team view (row-level security keeps the private window).
- **People** (spec 18.3 Users, admin): add a person with an email or phone and roles, change roles,
  deactivate (sign-in stops on the next request), all audit-logged. An admin cannot remove their own admin access.
- **Store numbers** (admin, spec 19.1): CSV upload of ups and sales by rep, lost-deal reasons, be-backs
  and walk-aways, phone and internet leads, and add-ons sold and cancelled, by month. A file is accepted whole or
  not at all, with every problem listed by line; re-uploading a month replaces it; reps are matched by email or
  name and unmatched names are kept and reported. Shows the close rate by month and by rep over the last 3 months,
  the baseline for spec 19.2's calibration. Only an admin reads or writes it (row-level security).
- **Exit-rate calibration** (spec 19.2 item 1, decision 0011): each ups upload sets the month's practice exit
  multiplier from the real unsold share against the practice exit share. It moves by at most ×0.5 to ×2 a month,
  keeps each scenario's authored difficulty, never lets exits pass 90%, and waits for 50 real ups and 30
  practice sessions. Practice only; certification keeps the standard rates.
- **Coach the coach** (spec 14.3): managers practice a floor check and are scored on its four parts.
- **Library**: all 122 techniques and 65 objections with grade, evidence note, sources, both languages, search
  and grade filter.

## Milestone acceptance (spec 22.1)

| Milestone | Item | State |
| --- | --- | --- |
| M1 | Monorepo, TypeScript strict, CI | Done; CI green on every push |
| M1 | Tenant and store schema with row-level security | Done for reads and writes: every tenant table isolates tenants, and writes are limited by role in the database (people and roles by an admin, store settings by an admin with sign-off only by the compliance reviewer, session results only into the rep's own session, login tables only through their functions) |
| M1 | i18n package with bilingual completeness check | Done |
| M1 | Authentication | Done: one-time code sign-in, hashed sessions, rate limits, role checks (email delivery needs `RESEND_API_KEY`; SMS not yet) |
| M1 | Speech provider interfaces, two implementations each | **Half done**: the interfaces (`@taptics/voice`) and the device implementation of each; the cloud implementations wait on the bake-off to choose providers (decision 0013) |
| M1 | Bake-off on consented Miami recordings | **Blocked on the store** (recordings, consent, provider keys) |
| M1 | Two-way spoken conversation under 1.5 s median | **Blocked** on provider keys |
| M2 | Content schemas and loader; O01 scenario with persona, facts, demos, rubric | Done |
| M2 | State machine: unlock, triggers, exit policy | Done; exit rates within 5 points over 100 runs (3 rep seeds), hidden truth never unlocked in 200 adversarial runs |
| M2 | Rule engine, PRICE/PAY/ADD/DEAD/CANCEL deterministic + classifier layer | Done; all 26 rules have a deterministic check where one is possible |
| M2 | Scoring deterministic and judge passes; debrief; behavior card | Done |
| M2 | Rep completes the scenario on a phone in under 15 minutes | Done in text mode (browser test at 390 px wide) |
| M2 | Debrief within 90 seconds | Offline: instant. Live judge: needs a key to measure |
| M5 | Floor check recorded in under 60 s on a phone; completion and timing on an admin's view | Done (browser test on a Pixel 7 viewport records it in about a second) |
| M3 | 600-utterance labeled suite | Done: 689 cases (344 English, 345 Spanish) from four independent authors, dev/holdout split |
| M3 | Under 5% false positives, both languages | Met by the deterministic layer alone: 1.6% overall (English 1.5%, Spanish 1.7%; holdout 2.9%) |
| M3 | Zero critical false negatives | **Not met.** The deterministic layer misses 116 critical cases; the target is for both layers together, and the classifier needs `ANTHROPIC_API_KEY` (decision 0008) |
| M3 | Store setup wizard and compliance reviewer sign-off; compliance view | Done |
| M4 | 122 techniques, 65 objections as content | Done (imported from the spec) |
| M7 | Accessibility audit | Done: axe (WCAG 2.1 A and AA) passes on every main screen for every role, a live practice session and a debrief, in CI. It found and fixed low-contrast grey text and keyboard-unreachable scrolling tables |
| M7 | Cross-tenant access tests on every API route (spec 21.1) | Done: a second company's admin aims every id-taking route at the demo company's records; every call is refused and nothing changes. It found and closed a write that could name another company's person (migration 0022) |
| M7 | Security headers | Done (decision 0037): CSP, HSTS, no framing, referrer and permissions policies; a browser test proves another origin's script is refused |
| M6 | Warm-up mode (spec 12.5) | Done (decision 0038) |
| M7 | Dependency and secret scanning in CI | Done: `pnpm audit --prod` (no known vulnerabilities) and a secret scan of tracked files (proven to catch a planted key) |
| M7 | Prompt-injection tests | Done offline: the engine never unlocks on injections (200 sessions), and an obedient model's leak is blocked and replaced before it is spoken, in both languages. To repeat against the real model once a key is set |
| M7 | Load test | Done offline: 25 reps at once, 0 errors; server share of a turn p95 205 ms warm, 410 ms on the first burst after boot; dashboard p95 1.3 s cold, 485 ms warm (budgets met). A boot warm-up cut the cold tail from 1.35 s. Live model latency needs the key (`docs/runbooks`) |
| M7 | Backup restore drill | Done: `scripts/backup-drill.sh` restores into a scratch database and proves every table's rows, 50 policies, forced RLS on 31 tables and 33 triggers match |
| M7 | Incident response runbook | Done (`docs/runbooks/README.md`) |
| M7 | Cost dashboard | Done: an admin sees 30-day model spend, cost per session, failure rate, and cost and latency by day, purpose and model; only an admin can read usage (row-level security) |
| M7 | Observability (traces, alerting) | Done without a vendor (decision 0021): structured logs with no personal data, server errors, turn timing, `/api/health`. Alerting is a Vercel log alert or an uptime monitor on `/api/health`: the owner's account choice |
| M4 | 20 release 1 scenarios with personas | Done: 20 scenarios and personas; every one plays offline in both languages to its hidden truth and win with no critical violation, and its flawed demo never reaches the hidden truth (CI gate) |
| M4+ | One level 1 customer per objection (65, spec 7 and 9, release 2) | Done: 45 more scenarios and personas, all through the same release gate in both languages (decision 0017). Spanish and claims to review: `docs/content/release-2-review-notes.md` |
| M4 | Every technique shows its grade, source and why | Done: all 122 have a "why" (67 honestly marked as tradition or weak evidence) and a flawed model line |
| M4 | Content editor with Spanish review workflow | Done for review (approve, edit with compliance check, numbers sign-off, write-back to YAML). Audio preview waits on the speech provider |
| M5 | Assignments | Done (row-level security: reps see their own; managers assign only to their reps) |
| M5 | Coach-the-coach roleplay | Done offline: the manager reads a scene, gives the floor check, and is scored on the four parts (the spec 14.2 example scores 100 in both languages); private to the manager, visible to an admin. With a key, an AI rep reply can be added |
| M6 | Mastery tracking, spaced scheduling, certification with fixed seeds | Done; a simulated 30-day onboarding schedules all 20 objections and offers certification from day 30 |
| M6 | Quarterly recertification | Done: a fixed random set of 3 per rep and quarter, passed at 75, renews level 1 for 90 days |
| M6 | Reminders that respect peak hours | Done by Web Push (decision 0022). The timing and the job are tested; the sender was checked against a local push endpoint, and the browser suite runs the job against the database. Real phones need the VAPID keys and an hourly schedule in the deployment |
| M4 | Spanish reviewed by a Miami native speaker | **Needs a person**: the review screen is ready; 0 of 897 release 1 lines reviewed |

## Numbers

- 892 unit and database tests (October 5; the breakdown below is from October 3, at 683): session 299 (the 65-scenario release gate in both languages, the 30-day simulation,
  objection weights, reminders), engine 152, rules 120, database 55 (row-level security for reads and writes,
  sign-in, repository, assignments, coaching practice, Spanish review, usage, people, store-number import, exit
  calibration, objection weights, product analytics, push reminders), scoring 19, AI client 16 (fake SDK), i18n 8,
  voice 8, content 3, web 3 (log redaction).
- 56 browser tests on October 5 (flows, the regression sweep of every screen of every role in both languages, accessibility audits, accounts, security headers, cross-company access, warm-up). On October 3: 24 browser tests (18 flows and 6 accessibility audits, every main screen audited in light and dark); each account signs in once per run, under the real limit
  of five codes per 15 minutes on the production build against Postgres (Pixel 7 viewport): rep sign-in, consent, practice,
  debrief and saved session; stop-on-critical with the violation stored; manager floor check and team view; a rep
  refused from manager screens, another rep's session and the floor-check API; an admin edits store
  setup (a one-language consent text is refused), cannot sign it off, and the reviewer signs off and sees the flags;
  a manager assigns practice with a reason, the rep sees it first, practices it, and it shows done; certification
  is refused without the live judge and the team view counts certifications; a manager practices a floor check, a
  weak one scores 50 with the card's wording for what was missing, the spec example scores 100; the Spanish reviewer
  approves a line, an edit that invents a deadline is refused, and a line with an amount waits for and gets the
  compliance reviewer's sign-off; an admin uploads store numbers, a bad file is refused line by line,
  a good one shows a 23% close rate and the exit calibration waiting for 30 practice sessions, lost-deal reasons
  put "the payment is too high" first and list the reason they could not match, and a rep is refused; the Usage
  page counts the run's sessions and read debriefs; the reminder job refuses calls without its secret, then sends
  once to a person whose time has come and never twice that day.
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

- **Production Send crash (October 3): root cause found and fixed.** The crash screen's details showed
  "TypeError: i is not a function". The practice room's scroll effect was written as an arrow returning
  `scrollIntoView(...)`; browsers that return a promise from scroll methods handed React a promise as the effect's
  cleanup, which React called on the first Send. Reproduced exactly on the production build by making scroll return a
  promise; fixed with a block body; a browser test clicks the real Send under that behavior, and a code guard fails
  CI on any effect that returns a value. Live-site verification needs salestaptics.com in this environment's network
  allowlist.

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

- **Voice on real phones:** the spoken flow is verified in Chromium with a scripted microphone and voice, not yet
  on an iPhone or Android phone. Before the pilot: one session each on iPhone Safari, Android Chrome and a laptop,
  in English and Spanish, on the showroom floor.
- **Cloud voice tier** (decision 0013): a recognition provider account and a voice provider account, chosen by the
  spec 11.2 bake-off, plus a Miami listener to approve the voices.
- **Preview and Production share one database** (set up 2026-10-03). Every branch's Preview build runs its
  migrations on that database, so a migration on a branch reaches production data before it reaches `main`.
  Concurrent deploys are safe (decision 0025), but a separate Preview database (a second free Supabase project, or
  a Supabase branch) is the safer setup. That is a setup choice for Fluffy.
- **Vercel deployment:** handled outside the build sessions by Fluffy (2026-10-03), following `docs/DEPLOY.md`.
  The database may be Supabase (decision 0023): use the pooler connection strings, never the IPv6-only direct
  address, and copy them from Supabase straight into Vercel. This environment cannot reach Supabase's API. All
  migrations, 0018 included, run in the deploy step.
- **App store accounts** (decision 0012): an Apple developer account, a Google Play developer account, a bundle id
  and a hosted URL, before the Capacitor shell can be built and submitted.

- **Case labels** are drafts until the compliance reviewer confirms them. The authors flagged
  their uncertain labels (for example: is a WhatsApp message a "text" under the consent rule? is a personal, live
  voicemail covered? does an ADD-04 disclosure need to come before the numbers?). The list is in
  `packages/rules/test/suite/README.md` under "Labels to confirm".

- **Spanish review and claims of the 45 release 2 customers:** `docs/content/release-2-review-notes.md` lists the
  words, claims and choices the authors were least sure of. Release 1 does not wait on them.
- **Spanish review** of the 19 release 1 scenarios added after O01. Authors flagged Cuban-Miami choices to check: "gomas", "chapa",
  "coger de bobo", "parabrisas rajado", "me la paso dándole vueltas", "el lease".
- **Scenario facts not in the deal sheet:** two good demos state true general facts the scenario does not hold
  (the Equinox has more cargo room than the Trax; the LS and LT share the factory warranty). True for current
  models, but a reviewer should confirm or move them into the facts.

## Next

0. **Customer-prep mode** (spec 12.5): the last session mode not built. It builds a persona from the rep's own
   description of a real upcoming customer, so it needs the live model and a privacy warning against names,
   phone numbers and financial details (spec 20.1 item 2). It is Ernesto's call when to build it.

1. M3: run the suite with both layers (`pnpm compliance:suite --with-classifier`) once `ANTHROPIC_API_KEY` is set,
   and work the critical misses to zero on dev, reporting holdout.
2. Text-message reminders as a second channel, behind the consent rules (CONSENT-01), if the store wants them.
3. Score validity is built (decision 0024); read it with the pilot store's first quarter and revisit its thresholds.
4. Walk-out triggers now ignore claims the rep explicitly refuses, and "I'm not going to lie" no longer excuses a
   violation. Next for the engine: the classifier layer once a key is set (item 1).
5. Live-AI pass over the 45 release 2 customers once a key is set, starting with O39 (a customer who prefers
   English until asked).
6. Voice gateway (`services/voice`) for the cloud tier, behind the `@taptics/voice` contracts, once the bake-off picks
   providers; then a Capacitor plugin for on-device recognition in the store apps.
