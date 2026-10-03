# Sales Taptics

Voice roleplay practice for car salespeople, in English and Miami Spanish: an AI customer with a hidden concern,
a compliance engine that allows hardball and forbids lies about facts, behavior scoring, and a weekly floor check
for the manager. Built from `SPEC.md`; progress in `STATUS.md`.

```bash
pnpm install
pnpm check                      # typecheck, tests, content CI, i18n check, web typecheck
pnpm --filter @taptics/web dev  # http://localhost:3000 (offline customer unless ANTHROPIC_API_KEY is set)
```

Local app with a database:

```bash
export DATABASE_URL=postgresql://...          # Postgres 16
pnpm db:seed                                  # migrations + demo tenant: rep@demo.test, rep2@, manager@, gm@
pnpm db:publish-content                       # the content library as an immutable release
TAPTICS_DEV_LOGIN=1 pnpm --filter @taptics/web dev   # sign-in codes shown on screen (development only)
pnpm --filter @taptics/web e2e                # browser tests against the production build
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (required) |
| `TAPTICS_SECRET` | 32+ characters; keys login-code hashes (required in production) |
| `ANTHROPIC_API_KEY` | Live AI customer, classifier and judge; without it, the offline customer |
| `RESEND_API_KEY`, `TAPTICS_EMAIL_FROM` | Email delivery of sign-in codes |
| `TAPTICS_CODE_OUTBOX` | File that receives sign-in codes (staging, browser tests); set only on purpose |
| `TAPTICS_DEV_LOGIN=1` | Shows sign-in codes on screen; ignored in production |

Database tests need Postgres 16 (`DATABASE_URL`, or a local socket as a superuser). `SKIP_DB=1` skips them
explicitly; they never pass silently without a database.

| Package | What it does |
| --- | --- |
| `packages/content` | Zod schemas, YAML library (techniques, objections, personas, scenarios, rubrics, rules, cards), loader, CI validator |
| `packages/rules` | Compliance engine: bilingual number parsing, deterministic checks for all 26 rules, classifier contract, customer-line guard |
| `packages/engine` | Scenario state machine: unlocks, walk-out triggers, exit draws, win detection |
| `packages/scoring` | Rubric scoring, honesty gate, debrief, weekly behavior card |
| `packages/ai` | Claude client, versioned prompts, AI customer, classifier, unlock detector, judge |
| `packages/session` | One practice session end to end; offline customer |
| `packages/db` | Postgres schema with row-level security, migrations |
| `packages/i18n` | UI strings in both languages, language detection |
| `apps/web` | Next.js phone-first web app |
