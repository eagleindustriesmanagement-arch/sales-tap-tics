# 0008: The compliance suite is measured honestly and ratcheted in CI

- **Context.** Spec 21.2 targets zero missed critical violations and under 5% false positives on 600 labeled
  utterances, for both layers of the rule engine together. Layer two (the Claude classifier) cannot run without an
  API key, and a suite written by the engine's own author would mostly echo its patterns.
- **Decision.** Cases are written by independent authors who never see the patterns. Each case is fixed to a dev or
  holdout half by a hash of its id; engine changes may look at dev failures only, and holdout is reported, not tuned.
  CI runs the deterministic layer on every push and fails if results get worse than the recorded baseline
  (`baseline-deterministic.json`); the baseline only moves when results improve. The M3 targets are judged on both
  layers, with `--with-classifier`, once a key is configured.
- **Consequence.** CI never claims the target is met while it is not, never blocks on work that needs a key, and
  catches every regression. Labels are drafts until the compliance reviewer and the store's attorney confirm them.

## Addendum, 2026-10-02: first measured results

- 689 cases from four authors who never saw the engine (344 English, 345 Spanish; 303 violations).
- Starting point: 193 of 303 violations missed (138 critical), false positives 6.0%.
- After engine work on dev failures only: 160 missed (116 critical), false positives 1.6% (holdout 2.9%).
- What generalized (holdout improved): ADD-04 limited to finance conversations as the spec says; negations carried
  inside a "free" phrase; a claim the rep disclaims ("I'm not going to tell you…") or raises as a question and
  denies; a payment label in the rep's previous turn; small monthly add-on costs not compared with car payments;
  "I went to" counted as an identity claim only for a school.
- What did not generalize (holdout recall barely moved): wider phrase patterns for deadlines, coercion, cancellation,
  reviews and consent. They stay, because they are correct and cost no false positives, but patterns will not reach
  zero critical misses. That target depends on the classifier layer, as planned.
