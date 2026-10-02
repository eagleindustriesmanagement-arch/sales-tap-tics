# Plan: M1 foundations and M2 first scenario (core logic first)

Date: 2026-10-02. Spec sections: 1–4, 6, 7, 10, 13, 22.

## Order of work

The bake-off in M1 needs consented Miami recordings that only the pilot store can provide (spec 11.2), so it is
blocked on people. Everything in M1 and M2 that does not need people, keys or audio is built first, in this order,
because sections 4 and 13 are the product's core (spec 1.1, item 2).

1. Monorepo, TypeScript strict, Vitest, CI workflow.
2. `packages/i18n`: UI strings (en, es), glossary, bilingual completeness check (fails CI if a side is missing).
3. `packages/content`: Zod schemas for techniques, objections, personas, scenarios, rubrics, rules, behavior cards,
   modules, glossary; YAML loader with store/tenant/platform resolution; validator CLI; one-time importer that
   turns spec sections 8 and 9 into the 122 technique and 65 objection files (so content is data, not code).
4. `packages/rules`: deterministic layer (bilingual number parsing, money-role detection, PRICE, PAY, ADD, DEAD,
   CANCEL first, then the remaining families), classifier-layer interface, session-level order checks.
5. `packages/engine`: scenario state machine, seeded variation, unlock tracking, trigger tracking, exit policy that
   holds the configured per-session exit rate, win detection, turn and time limits.
6. `packages/scoring`: deterministic items, judge interface, assembly with the honesty gate, text-mode exclusions,
   low-confidence "not scored", behavior card selection.
7. `packages/ai`: one Claude client wrapper (retries, timeouts, cost logging per tenant, kill switch), prompts as
   versioned files (customer, compliance classifier, unlock detector, judge, debrief).
8. `packages/db`: Postgres schema (section 6) with row-level security and cross-tenant tests against a real Postgres.
9. `services/voice`: `SpeechToText` and `TextToSpeech` interfaces with two implementations each, turn-taking,
   number normalization for synthesis, bracket-cue stripping.
10. `apps/web`: Next.js PWA with the rep flow (scenario intro, practice room with text fallback, debrief) and the
    manager floor-check card.

## Tests written alongside

- i18n: every key has en and es; glossary entries complete.
- content: every library file validates; bilingual completeness; placeholders resolvable; compliance engine run
  on every model line (critical violation blocks CI); FAIR-01 number parity between en and es lines.
- rules: spec 21.2 must-pass and must-fail examples in both languages; near misses (negations, questions);
  low-confidence numbers become review flags, not critical fails.
- engine: walk-away and not-now rates within ±5 points of configuration over 100 seeded runs; hidden truth never
  unlocked without an unlock condition; difficulty 3 needs two unlocks; triggers raise exit probability.
- scoring: O01 rubric (spec 10.5) totals; honesty gate fails the attempt; text mode excludes voice-only items.
- db: a user in tenant A cannot read any row of tenant B, on every tenant table.

## Acceptance (from spec 22.1) and what this session can prove

| Criterion | Provable here? |
| --- | --- |
| Cross-tenant tests pass | Yes, against local Postgres 16 |
| Bake-off picks a provider | No: needs consented store recordings and provider keys |
| Two-way spoken conversation < 1.5 s median | No: needs provider keys and a browser with a mic |
| Walk-away rate within 5 points over 100 runs | Yes (engine simulation) |
| Hidden truth never leaks in 200 adversarial runs | Engine side yes; model side needs an API key |
| Debrief within 90 s | Needs an API key |
