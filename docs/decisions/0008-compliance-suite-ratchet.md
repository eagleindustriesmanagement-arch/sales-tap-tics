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
