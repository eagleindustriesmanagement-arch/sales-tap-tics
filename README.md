# Sales Tap-tics

Voice roleplay practice for car salespeople, in English and Miami Spanish: an AI customer with a hidden concern,
a compliance engine that allows hardball and forbids lies about facts, behavior scoring, and a weekly floor check
for the manager. Built from `SPEC.md`; progress in `STATUS.md`.

```bash
pnpm install
pnpm check                      # typecheck, tests, content CI, i18n check, web typecheck
pnpm --filter @taptics/web dev  # http://localhost:3000 (offline customer unless ANTHROPIC_API_KEY is set)
```

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
