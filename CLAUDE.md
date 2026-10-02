# Sales Tap-tics — guide for Claude

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

## Commands

    pnpm install
    pnpm typecheck && pnpm test          # unit + database tests (needs DATABASE_URL; SKIP_DB=1 to skip the DB ones)
    pnpm content:validate                # schemas, cross-references, compliance check of every content line
    pnpm i18n:check
    pnpm compliance:suite                # 689 labelled cases; fails if any number gets worse than the baseline
    pnpm secret:scan
    pnpm web:typecheck && pnpm web:build
    pnpm db:seed --private-window-hours=0 && pnpm --filter @taptics/web e2e   # 10 flows + 5 accessibility audits
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
- Recurring false-positive shapes worth remembering: a negation inside the matched phrase ("no charge"); a claim the
  rep disclaims or asks and denies; an appointment time next to a real deadline; "end up" / the noun "end"; a denied
  number ("no son 32,450"); "más" meaning "plus" before charges.

**Content authoring**
- A scenario's good demo must unlock the hidden truth, reveal it, and end with an accepted day and time; the flawed
  demo must never unlock. `packages/session/test/every-scenario.test.ts` enforces this in both languages.
- Flawed lines may break a rule only if they declare it and the engine detects it; demos may not break critical
  rules at all. Target techniques need a `why`.
- Agents writing content in parallel work well with one file set each, the template pair to copy, and the exact
  verification commands; ask them to list the lines they are unsure of.

**Product and UI (carried over from BookFlows' guidelines, they apply here too)**
- The phone-on-the-floor test: readable in sunlight, thumb-tappable (targets >= 48 px), understood in 3 seconds.
- Spanish labels run about 30% longer: check every screen in Spanish for overflow. The language switch is one tap
  from anywhere.
- Text contrast >= 4.5:1, measured (the axe audit in CI measures it). Dark mode is first-class.
- Plain-talk copy: shorten, never slick-ify. A score is never shown without the one change that matters most.
- Refine, don't reinvent: keep names, structure and voice the owner settled.

## Agents

- `.claude/agents/hardening.md` — QA and defensive review (adapted from BookFlows): finds and fixes defects with a
  failing test first, never adds features, keeps `HARDENING_REPORT.md`.
