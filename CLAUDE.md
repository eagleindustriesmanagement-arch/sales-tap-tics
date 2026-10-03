# Sales Taptics — guide for Claude

Bilingual (English / Miami Spanish) role-play trainer for car salespeople. The owner's spec is `SPEC.md`; what is
built and what is open is `STATUS.md`; every deviation from the spec is a decision in `docs/decisions/`. Read
STATUS.md first.

## Non-negotiables (spec sections 1-4)

- **Hardball yes, lies about facts no.** The rule engine (`packages/rules`) checks every rep line, AI customer line,
  demonstration and content file against the scenario's true facts. Never weaken a rule, a test or the compliance
  baseline to make something pass; fix the line or the engine.
- **Content is data.** Techniques, objections, personas, scenarios, rules and the lexicon are YAML in
  `packages/content/library`, validated by Zod. Text the app shows lives there or in `packages/i18n` (both
  languages, always; `pnpm i18n:check`).
- **Strictest reading** of every compliance rule until a person decides otherwise (decision 0009).
- **Decisions** go in `docs/decisions/NNNN-*.md`; plans in `docs/plans/`; update STATUS.md after each milestone.
- Do not put model identifiers in commits or docs beyond `packages/ai/src/models.ts` and decision 0006.

## Design

**Every UI change follows `docs/DESIGN-GUIDELINES.md`** (Liquid Glass from BookFlows, `docs/LIQUID-GLASS.md`).
One dark luxury theme (decision 0028): charcoal surfaces, warm ivory ink, champagne gold as the only accent (gold
text and links, gold-metal primary buttons with dark ink, glass secondary buttons), Instrument Serif
(`font-display`) for titles and big numbers, Inter for the rest. Colours are tokens in `app/globals.css`, never hex
or `white`/`blue` utilities in a component; charts and rings are gold, green and red only for verdicts. Use the
building blocks in `apps/web/components/ui.tsx` (every h1 is `PageHeader` or `titleClass`) and the icons in
`components/icons.tsx`; never put a `bg-*` or `border-*` utility on an element with a `liquid-glass` class.
Motion uses one curve, never holds content back (entrances end within 0.9s, `backwards` fill, reduced motion
shows the final state) and never puts a lasting transform above the practice room's fixed bars. Review 390px and
desktop screenshots before calling a screen done; the accessibility suite measures contrast on the dark theme.

## Deploying

The site is Sales Taptics at salestaptics.com on Vercel with Neon Postgres (decision 0014). To deploy, follow
`docs/DEPLOY.md` section A: it needs `VERCEL_TOKEN` in the environment and Vercel's hosts allowed. Never print a
token or the generated `TAPTICS_SECRET`, and never ask the owner to paste one into chat.

## Commands

    pnpm install
    pnpm typecheck && pnpm test          # unit + database tests (needs DATABASE_URL; SKIP_DB=1 to skip the DB ones)
    pnpm content:validate                # schemas, cross-references, compliance check of every content line
    pnpm i18n:check
    pnpm compliance:suite                # 689 labelled cases; fails if any number gets worse than the baseline
    pnpm secret:scan
    pnpm web:typecheck && pnpm web:build
    pnpm db:seed --private-window-hours=0 && pnpm --filter @taptics/web e2e   # 16 flows + 5 accessibility audits
    pnpm --filter @taptics/web dev       # http://localhost:3000; demo logins: rep@ / rep2@ / manager@ / gm@ /
                                         # review@ / es@demo.test (codes print to the server log in development)

Environment variables are listed in README.md. Without `ANTHROPIC_API_KEY` the app runs the offline customer and
marks scores partial; certification needs the key.

## Lessons learned building this (save yourself the time)

**Tooling**
- Next 16 here builds with `next build --webpack`: Turbopack does not resolve the packages' `.js` import specifiers
  to `.ts`. The webpack `extensionAlias` in `next.config` does.
- Packages export TypeScript source; there is no build step for them. Scripts run with `tsx`; top-level `await`
  needs a `.mts` file or an ESM package.
- Never `pkill -f` / `pgrep -f` with a pattern that also matches your own shell command: it kills the shell. Stop a
  server by port with `python3 scripts/stop-port.py <port>`.
- In a cloud container, Postgres can stop after the container recycles: `pg_ctlcluster 16 main start`. Database
  tests fail loudly without `DATABASE_URL` unless `SKIP_DB=1`.
- Postgres folds unquoted identifiers to lowercase: create and connect with lowercase database names.

**Testing**
- Browser tests run against the production build with a file outbox for login codes, not the dev server (compile
  races). The sign-in helper must wait until the browser leaves /login before navigating, or CI's slower runner
  lands back on /login.
- Playwright runs files alphabetically; tests that depend on first sign-ins (consent) live in the `flows` project
  and the accessibility audit is a separate project that depends on it.
- Scope database assertions in tests to the demo tenant/store: other tenants (the load test) may share the database.
- TypeScript does not check `data-*` attributes on components: a component must forward them (`Card` does) or the
  test id silently disappears.
- Prove a check catches something before trusting it (the secret scan was tested with a planted key).

**The compliance engine**
- The suite is split dev/holdout by id hash. Tune only on dev failures and report holdout. Wider phrase patterns
  help dev but barely move holdout recall; fixes to logic (negation, scope, roles) generalize. Zero critical misses
  needs the classifier layer (decision 0008).
- Revert a change that adds a false positive and catches nothing measurable, even if it looks right in a unit test.
- Before narrowing a critical rule's pattern, try the narrowed shape with a day or "today" next to it: "si no
  decide hoy, termina pagando más" is a real DEAD-01 violation even though "termina pagando" alone is not.
- Recurring false-positive shapes worth remembering: a negation inside the matched phrase ("no charge"); a claim the
  rep disclaims or asks and denies; an appointment time next to a real deadline; "end up" / the noun "end"; a denied
  number ("no son 32,450"); "más" meaning "plus" before charges; "las dos + noun" (both, not 2:00); a lone "un" /
  "one" before a money word; "another $2,000" (an increase, not a total); a small number before a weekday (not a
  time unless "at 5", "5:30" or "5 pm").

**Content authoring**
- A scenario's good demo must unlock the hidden truth, reveal it, and end with an accepted day and time; the flawed
  demo must never unlock. `packages/session/test/every-scenario.test.ts` enforces this in both languages.
- Flawed lines may break a rule only if they declare it and the engine detects it; demos may not break critical
  rules at all. Target techniques need a `why`.
- Agents writing content in parallel work well with one file set each, the template pair to copy, and the exact
  verification commands; ask them to list the lines they are unsure of. Give each its own git worktree, and tell
  them **never to use `git stash`**: the stash is shared by every worktree, and two agents stashing at once swap
  each other's files.
- Release status follows the objection (`release_1`): release 2 customers practice under "More customers" and never
  certify (decision 0017). The flagged words and claims of the 45 release 2 customers are in
  `docs/content/release-2-review-notes.md`.
- A technique's model line is checked against its `example_deal` over `examples/deal.yaml` (decision 0019): a model
  line that states a number or a deadline needs it in that deal.

**Product and UI (carried over from BookFlows' guidelines, they apply here too)**
- The phone-on-the-floor test: readable in sunlight, thumb-tappable (targets >= 48 px), understood in 3 seconds.
- Spanish labels run about 30% longer: check every screen in Spanish for overflow. The language switch is one tap
  from anywhere.
- Text contrast >= 4.5:1, measured (the axe audit in CI measures it). There is one theme, dark; every token pair is
  checked against the surfaces it sits on.
- Plain-talk copy: shorten, never slick-ify. A score is never shown without the one change that matters most.
- Refine, don't reinvent: keep names, structure and voice the owner settled.

- **Hosting (Vercel + Neon, decision 0014, `docs/DEPLOY.md`).** The database owner there is not a superuser:
  never `force row level security` (it breaks the security-definer sign-in functions and the seed, and tests as a
  superuser never see it); a migration must run as a non-superuser owner (CI runs `pnpm db:deploy` that way first).
  Never bake a build-machine path into the bundle (`next.config` `env`); resolve data directories at run time.
  Never keep state only in one server's memory: live sessions are rebuilt from stored turns on any instance.
- **Deploys share the database and may go through a transaction pooler** (decisions 0025, 0026). A deploy step's
  database work runs inside `withDeployLock` (one transaction, a transaction-scoped advisory lock, re-check inside).
  Never rely on session state on a connection: no session-level `set`, `set_config(..., false)`, session advisory
  locks or `LISTEN`. Connections are made with `pgConfig(url)` so `DATABASE_CA_CERT` applies. Roles are shared by a
  whole Postgres server: to rehearse a fresh hosted database, use a new server (`pg_createcluster 16 x --port 5433`),
  not just a new database.
- **`pnpm --filter x deploy` runs pnpm's own deploy command**, not a script named deploy. The database release
  script is `release`, run through `pnpm db:deploy`.
- **Voice is tested with a scripted recognizer and voice** (`e2e/flows.spec.ts`, the spoken session): real
  phones still need a manual pass (iPhone Safari routes audio to the earpiece while the microphone is open).
- **A segmented control's radio must be clickable, not `sr-only`**: browser tests (and some screen readers) treat
  `sr-only` inputs as invisible. Cover the segment with the invisible input instead (`SEGMENT_INPUT`).

## Agents

- `.claude/agents/hardening.md` — QA and defensive review (adapted from BookFlows): finds and fixes defects with a
  failing test first, never adds features, keeps `HARDENING_REPORT.md`.
