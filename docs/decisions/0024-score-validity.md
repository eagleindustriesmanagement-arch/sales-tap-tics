# 0024: Score validity is a correlation table, with its sample size and a warning

- **Context.**
  - Spec 19.2 item 3: quarterly, correlate each rep's rubric dimension scores with their outcome metrics. Report
    the correlations to the general manager with sample sizes and a plain warning that correlation is not proof.
    Items whose scores never relate to outcomes become candidates for lower weight.
  - The spec sets no method, minimum sample or threshold.
- **Decision.**
  - **Method.** A Pearson correlation across reps for the total score and each dimension (composure, discovery,
    technique, outcome), against two outcomes:
    - the close rate from the ups upload;
    - the share of add-ons kept after 60 days, from the add-ons upload.

    The sign is flipped for add-ons, so a positive number always means "higher score, better result".
  - **Data.**
    - Practice: complete (not partial) practice and certification scores of the last 13 weeks, averaged per rep.
      Only sessions the general manager may already see count, so private windows are respected.
    - Outcomes: the last 3 imported months, for reps the upload matched by name or email.
  - **Minimums.** A rep counts with at least 3 complete scores and 20 logged ups. Nothing is shown until 5 reps
    count; until then the page says how many do.
  - **Weak measures.** One whose correlation is under 0.1 in size for every outcome it can be computed against is
    listed as a candidate for less weight. Nothing changes automatically: rubric weights are content, changed by a
    person (decision 0004).
  - **Where.** On the general manager's Store numbers page, worked out each time the page opens, so it is always
    current. "Quarterly" is how often someone should look, not a scheduled job.
- **Consequence.**
  - With one store of 10 to 20 reps, a correlation is noisy. The sample size sits next to every number, and the
    page says plainly that correlation is not proof.
  - The thresholds (5 reps, 3 scores, 20 ups, 0.1) are engineering judgment. Revisit them with the pilot store's
    first quarter of data.
