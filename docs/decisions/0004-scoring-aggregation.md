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
  replaced by calibration against store outcomes (spec 19.2). **Needs owner confirmation.**
