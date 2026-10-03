# 0019: Technique lines are checked against an example deal

- **Context.**
  - Content CI checked every technique's model and flawed line with no deal facts, because a technique belongs to
    no scenario. The engine's fact-based rules (a price without its fees, a made-up deadline, a trade number that
    is not the appraisal) cannot run without facts.
  - As a result, nothing checked that a technique's model line was true, and a flawed line could not show a
    fact-based violation (STATUS "Next", item 4).
- **Decision.**
  - `packages/content/library/examples/deal.yaml` holds one example deal: a 2026 Equinox LT at $32,794 all in,
    with no rebates, deadlines or trade.
  - A technique whose model line states its own facts declares them in `example_deal`. That deal is applied over
    the example deal and validated as complete scenario facts. Nine do: T015, T020, T027, T030, T102, T104, T106,
    T107 and T111.
  - `pnpm content:validate` checks every technique line against its deal.
  - Two flawed lines now show the violation their lesson is about, and declare it (DEAD-01):
    - T020: a real rebate with a made-up "ends today";
    - T107: real bonus cash with a made-up "ends tomorrow".
  - An engine fix found on the way: "another $2,000 on your trade" (Spanish "otros dos mil") is an increase, not
    a trade total. Before, only "more" after the amount marked an increase. The compliance suite shows no
    regression, and a unit test covers it.
- **Consequence.**
  - A technique's model line can no longer state a number or a deadline that its own deal does not hold.
  - The example deals are teaching props, not store facts. T030's $38,912 is stored as the all-in price even
    though its line says it includes tax and tag. The facts have no out-the-door field, and the line is the
    spec's.
