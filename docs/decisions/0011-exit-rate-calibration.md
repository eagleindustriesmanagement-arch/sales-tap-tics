# 0011: Exit rates are calibrated with one multiplier per store and month

- **Context.** Spec 19.2 item 1: monthly, set each scenario's walk-away and not-now base rates so the share of
  practice sessions ending in an exit roughly matches the store's real share of unsold ups, adjusted by difficulty
  level. The spec sets no method, sample size or bounds. Real unsold shares run far above the authored rates (a 20%
  close rate is 80% unsold, while authored exits total 35 to 45%), and the store's data arrives as a monthly CSV in
  release 1 (spec 19.1).
- **Decision.**
  - One multiplier per store scales every scenario's authored walk-away and not-now base rates. Scaling keeps
    each scenario's authored ratio, so harder scenarios stay harder: that is the difficulty adjustment.
  - Each month: multiplier = previous multiplier × (real unsold share ÷ practice exit share).
    - Real unsold share uses the last 3 imported months of ups.
    - Practice exit share uses the store's finished practice sessions of the last 90 days that ran under the
      previous multiplier. It counts sessions inside reps' private windows through a counts-only database function.
    - Recomputing a month starts from the month before, so it never compounds.
  - Bounds:
    - One month moves the multiplier by at most ×0.5 to ×2.
    - The multiplier stays between 0.25 and 4.
    - Walk-away plus not-now never exceeds 0.9, so every customer can still be won.
    - Nothing changes with fewer than 50 real ups or 30 finished practice sessions.
  - Calibration runs when the general manager uploads ups data. It applies to practice only. Certification always
    uses the authored rates, so certifications stay comparable across stores (spec 15.4). Each session records the
    multiplier it ran under.
- **Consequence.**
  - Practice drifts toward the store's real floor over a few months, without one bad month swinging it.
  - "Ending in an exit" counts sessions whose end reason is walk-away or not-now. Exits the rep recovered with a
    next step are not counted, so a stronger team sees the multiplier rise until practice is as hard as the floor.
  - The thresholds (50, 30, ×2, 0.9) are engineering judgment, not research. Revisit them with the first pilot
    store's data.
