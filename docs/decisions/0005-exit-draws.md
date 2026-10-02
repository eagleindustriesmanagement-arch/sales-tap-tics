# 0005: Exit draws use a low-discrepancy sequence per rep and scenario

- **Context.** Walk-away and not-now exits must occur at the configured rate within ±5 points over 100 sessions
  (spec 1.3, 21.3). Independent random draws have a standard deviation of 3 to 4.3 points at these rates over 100
  sessions, so a correct engine would fail its own acceptance test about one run in five, and one rep could get
  an unlucky streak of easy customers.
- **Decision.** Each session draws one number u in [0, 1) at its start. u is the k-th term of a golden-ratio
  (Weyl) sequence, where k is the rep's attempt number on that scenario, offset by a secret per-rep value. The
  engine exits when u falls under the current walk-away probability, or under walk-away plus not-now. Triggers
  raise the walk-away probability during the session and the same u is re-tested at each checkpoint, so the rate
  without triggers is exactly the configured base, and triggers only ever make an exit more likely.
- **Consequence.** Rates hold to within about 2 points over any 100 consecutive attempts, while no rep can predict
  the next customer. Certification uses fixed seeds (spec 15.4), so it passes an explicit u per seed.
