# Runbooks

Short, tested procedures. Each names the command, what "good" looks like, and what to do if it is not.

## Backup restore drill (spec 20, M7)

    DATABASE_URL=postgresql://... scripts/backup-drill.sh

Dumps the database, restores it into a scratch database, and compares row counts in every table, row-level security
policies, forced RLS and triggers, then drops the scratch copy. Good: `drill passed`. Run it monthly and after any
schema migration. Last run 2026-10-02 on the development database: every table matched, 50 policies, 31 tables with
forced RLS, 33 triggers, 1 second.

If it fails: do not delete the dump; compare the listed tables. A count mismatch during heavy writes can be a
timing artifact, so rerun once in a quiet period; a policy or trigger mismatch is real and blocks the next deploy.

## Load test (spec 5.6, M7)

    next start -p 3300   # with DATABASE_URL, TAPTICS_SECRET, TAPTICS_OFFLINE=1, TAPTICS_CODE_OUTBOX=<file>
    BASE_URL=http://localhost:3300 TAPTICS_CODE_OUTBOX=<file> DATABASE_URL=... REPS=25 tsx apps/web/scripts/load-test.ts

Uses its own tenant. Measured 2026-10-02, one server process, 25 reps sending at the same moment, offline customer:

| Measure | Cold (first burst after boot) | Warm | Budget (spec 5.6) |
| --- | --- | --- | --- |
| Server share of a turn, p50 / p95 | 198 / 410 ms | 144 / 205 ms | Fits inside 1.0-1.2 s / 2.5 s total with speech and model |
| Post-session scoring (offline), p50 / p95 | 175 / 239 ms | 169 / 204 ms | 30 s / 90 s (the live judge adds model time) |
| Team dashboard, p50 / p95 | 669 / 1,320 ms | 353 / 485 ms | 1 s / 2.5 s |

The boot hook (`apps/web/instrumentation.ts`) loads content, compiles the rule engine with one offline turn per
language and opens 10 database connections; without it the cold p95 turn was 1.35 s. The pool holds 20 connections
per instance (`TAPTICS_DB_POOL`). Not yet measured: the live model's latency and cost, which need `ANTHROPIC_API_KEY`.

## Incident response

1. **A compliance rule teaches something wrong.** Fix the rule file, add the line to `packages/rules/test`, publish.
   If reps must stop seeing it at once, set the rule's status in content and publish; scores already given stay
   (they are immutable) and the debrief notes the rule changed.
2. **The AI customer says something it should not.** Every line is guarded before it is spoken; check `model_usage`
   and the session's incidents. The kill switch per purpose and model is an environment setting (`packages/ai`); with
   the customer switched off, practice falls back to the offline customer.
3. **Model costs spike.** `model_usage` has tokens and cost per tenant, purpose and model; switch the purpose off with
   the kill switch, then investigate.
4. **Data exposure suspected.** Every read of another person's session is in `audit_log`; row-level security tests
   run in CI. Revoke sessions by deleting `auth_sessions` rows for the user.
5. **Database lost.** Restore from the latest dump (procedure above), then run migrations; the drill proves it.
