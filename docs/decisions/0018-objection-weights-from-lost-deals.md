# 0018: Objection weights from the store's lost-deal reasons

- **Context.**
  - Spec 19.2 item 2: monthly, weight objections by the store's logged lost-deal reasons, discounting stated
    reasons known to hide real ones ("no time", "spouse").
  - Spec 9 names what those reasons usually hide: price, payment, financing or another store.
  - The store's reasons arrive as free text in a monthly CSV (spec 19.1; the import exists since decision 0011).
  - The spec sets no mapping, formula, sample size or bounds.
- **Decision.**
  - **Mapping is content.** `packages/content/library/calibration/lost-reasons.yaml` lists 22 reason groups.
    - Each group has case-insensitive English and Spanish patterns and the objections it stands for. A store's
      reason goes to the first group that matches.
    - Reasons that match nothing are listed for the general manager and not counted.
  - **Hidden reasons.** For "spouse or family", "think it over" and "no time", half of each lost deal
    (`hidden_share`) counts for the stated objections. The other half is spread over payment (O03), price (O04),
    rate and outside financing (O11) and another dealer (O10).
  - **Formula.**
    - weight = 1 + 10 × the objection's share of matched lost deals, capped at 5. An objection behind a tenth of
      the store's lost deals weighs 2.
    - Objections the store never names keep 1: stated reasons are unreliable, and absence is not evidence.
    - The store weight multiplies the objection's authored `frequency_weight`.
  - **Data.** The last 3 imported months are used. With fewer than 30 matched lost deals nothing changes.
  - **When.** It runs when the general manager uploads lost-deal reasons, and is stored per month in
    `store_calibrations` (kind `objection_weights`). Everyone in the store reads it; only the general manager
    writes it.
  - **What it changes.**
    - The order of onboarding scenarios after week 1.
    - The tie-break between equally due reviews.
    - Which new customer fills a free plan slot after onboarding.
    - It never touches assignments, compliance redos or certification.
  - **What the general manager sees.** The store numbers page shows the objections practiced first, lost deals by
    reason group, and the reasons that were not matched.
- **Consequence.**
  - The multiplier 10, the cap 5, the 50% hidden share and the 30-deal minimum are engineering judgment, not
    research. Revisit them with the pilot store's data.
  - A store whose CRM uses its own reason codes may need patterns added to the mapping file. The unmatched list
    shows which.
