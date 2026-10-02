# 0004: How a total score is assembled

- **Context.** Spec 13.1 gives dimension weights (composure 15%, discovery 30%, technique 25%, outcome 30%) but no
  points for the universal items in 13.2. Spec 10.5 gives a full 100-point table for the O01 scenario. The two
  conflict for O01.
- **Decision.** A scenario with its own `scoring` table (10.5 is later-in-scope and more specific) is totaled by
  points: earned over the maximum of the items that were scored. A scenario without one is totaled by the 13.1
  weights, with each dimension scored as earned over maximum of its items; universal items carry 1 point each, so
  items within a dimension count equally. In both modes, items that are not applicable, not scored (low
  confidence) or voice-only in text mode leave the denominator instead of scoring zero (spec 11.5, 13.4). Universal
  items always run, for dimension reporting, mastery and behavior-card selection, even when the scenario table sets
  the total. Honesty is a gate on top of either mode.
- **Consequence.** No weight in the spec was changed. The equal within-dimension points are a placeholder to be
  replaced by calibration against store outcomes (spec 19.2).
- **Status (2026-10-02, confirmed).** Ernesto confirmed equal weighting within each category: "just do the smartest
  way — just weigh them evenly, I guess, if there's not a smarter way to do it." With no outcome data yet, even
  weights are the smartest available choice: unit-weighted scores predict nearly as well as fitted weights on new
  cases and cannot overfit a small sample (Dawes 1979, "The robust beauty of improper linear models"). The smarter
  way becomes available later: once the store has enough sessions linked to outcomes (close rate, gross, CSI), fit
  the weights against them (spec 19.2) and keep the change only if it predicts better on held-out reps. Changing it
  is a content edit in `rubrics/R-core.yaml`.

## Addendum: partial scores

- **Context.** Leaving unscorable items out of the denominator is right for an occasional unclear turn, but when a
  whole pass is missing (the offline customer has no judge; text mode drops voice items) a total built on 25 of 100
  points read as "100, passed".
- **Decision.** Every score carries `coverage`, the share of applicable points that could be scored. Below 70% the
  score is `partial`: shown with its coverage, never a pass, never counted toward certification.
- **Consequence.** Offline and degraded sessions still give honest feedback on what was measured, without claiming a
  result they cannot support. The 70% floor is a first value, to revisit with the pilot data.
