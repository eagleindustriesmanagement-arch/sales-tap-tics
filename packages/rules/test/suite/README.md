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
  finance: false              # true for a finance-office conversation (R-finance), where ADD-04 applies
  text: "..."                 # one utterance, or use `turns` for session-level rules
  turns: ["...", "..."]       # several rep turns in one session (order and presence rules)
  expect: [PRICE-01]          # rules that must fire; [] means nothing may fire
  note: "why"                 # optional
```

## Labels to confirm

The authors marked these labels as judgment calls. The compliance reviewer and the store's attorney should confirm
or change them; until then they stand as written.

**Consent and reviews**
- `lh-con-009`: a WhatsApp message counted as a text (violation without consent).
- `lh-con-018`: a live, personal voicemail labelled compliant; only automated voicemail is treated as covered.
- `lh-con-004`: "I'm sending you a quick text…, okay?" A trailing "okay?" is not documented consent (violation).
- `lh-rev-015`: a drawing entry for any review, good or bad, labelled compliant (reward not tied to sentiment).

**Deadlines, availability, cancellation, coercion**
- `da-dead-es-09`: "Mañana ya no le puedo garantizar este precio" counted as a deadline for tomorrow.
- `da-avail-es-06`: "Ya casi no quedan" with three units counted as a false scarcity claim.
- `da-avail-es-12`: "Este color se vende bastante" (popular, no count) labelled compliant.
- `da-transit-en-07`: in-transit status disclosed only in the last turn, after the numbers, labelled compliant.
- `da-cancel-en-06`: "if your wife hates it on Monday we'll just tear up the deal" (a dealer promise with no store
  unwind policy) labelled a CANCEL-01 violation.
- `da-coerce-en-12`, `da-coerce-es-12`: "I'm not letting you leave without asking you one thing" treated as a figure
  of speech (near miss).
- `da-auth-en-08`, `da-auth-es-08`: "My manager can do $575 if you're ready today" labelled compliant (spec 21.2
  must-pass example).

**Add-ons, rate, trade**
- `ar-add04-en-005`: "cancel anytime" without the 60-day window is an ADD-04 violation.
- "The bank requires GAP" lines are labelled ADD-01 only, not also RATE-01.
- `ar-rate01-en-006`, `ar-rate01-es-006`: a made-up lender down-payment requirement is RATE-01.
- `ar-rate01-en-005`, `ar-rate01-es-005`: a rate given as an estimate ("maybe three percent tops") is a violation;
  a plainly hypothetical rate is not.
- `ar-trade01-en-002`, `ar-trade01-es-003`, `ar-trade01-en-005`: citing a basis other than the real appraisal basis
  is TRADE-01.
- `ar-add02-es-008`: promising removal is possible while the store policy is unset, labelled compliant.
- `ar-trade02-es-004`, `lh-lang-005`, `lh-lang-009`: a condition stated only in the other language expects both
  LANG-01 and TRADE-02.

**Price and payment**
- `pp-p03-en-04`, `pp-p03-es-04`: an unqualified first-responder price expects PRICE-03 and PRICE-01.
- `pp-pay03-en-03`, `pp-pay03-es-03`: $599 on the wrong term expects PAY-03 and RATE-01.
- `pp-pay01-en-04`, `pp-pay01-es-04`: "fully taken care of" without naming the products is a PAY-01 violation.
- `pp-p04-en-12`, `pp-p04-es-12`: the rep's own "not moving on price" is hardball, not AUTH-01.
- `lh-hb-025`, `lh-hb-078`: "If my manager can get you $15,000 on the Malibu, do we have a deal?" labelled compliant
  (within the manager's limit).
