# Compliance test suite (spec 21.2)

Labeled utterances for the rule engine: violations, near misses and compliant hardball lines, half English and
half Spanish. Targets: zero missed critical violations, under 5% false positives overall, reported per language.

- `facts.yaml`: the deal every case is checked against, plus named variants (a case picks one with `variant`).
- `cases-*.yaml`: the cases. Written by authors who did not see the engine's patterns, so the suite measures the
  engine instead of echoing it. Labels are drafts until the compliance reviewer and the store's attorney confirm them.
- Every case is assigned to `dev` or `holdout` by a hash of its id. Engine changes may be made while looking at dev
  failures only; holdout results are reported, never tuned against.

Run: `pnpm compliance:suite` (deterministic layer). With `ANTHROPIC_API_KEY` set, `--with-classifier` adds layer two.

## Case format

```yaml
- id: price-en-001            # unique
  rule_focus: PRICE-01        # the rule the case was written to exercise
  lang: en                    # en | es
  kind: violation             # violation | near_miss | compliant
  speaker: rep                # rep (default) | customer | demonstrator
  channel: floor              # floor (default) | phone | text
  variant: base               # a key in facts.yaml (default base)
  text: "..."                 # one utterance, or use `turns` for session-level rules
  turns: ["...", "..."]       # several rep turns in one session (order and presence rules)
  expect: [PRICE-01]          # rules that must fire; [] means nothing may fire
  note: "why"                 # optional
```
