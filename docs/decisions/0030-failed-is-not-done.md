# 0030: A lesson is done only when it passes

- **Context.** The owner (October 3): "The lessons show up as complete even though the sales rep failed."
  - Any finished session, whatever its score, marked a manager's assignment "Done". The database test even
    asserted it, with a score of 40 that did not pass.
  - The onboarding plan counted a scenario as met once it had been tried, so a failed lesson never came back on
    its own.
- **Decision.**
  - **Assignments close only on a pass**: a complete score at or above the pass mark with honesty passed. A failed
    or partial score leaves the assignment open, and the rep keeps seeing it first.
    - The manager's list shows "Not passed yet · best N" after a complete failing score.
    - It shows "Tried, no complete score yet" after offline practice.
  - **The plan brings a failed lesson back first** ("Not passed yet: your best is N. Run it again until it
    passes."), and the next new lesson still takes the second slot, so onboarding keeps its pace.
    - The 30-day simulation now fails every first attempt and still meets all 20 objections and offers
      certification on day 30.
  - **The practice path** labels a scenario with a complete, failing best score "Not passed yet". Only a pass shows
    the green check.
  - **An offline (partial) score is neither a pass nor a failure** (decision 0004): it never completes an
    assignment and never triggers a retry.
- **Consequence.**
  - Without the live AI, assignments cannot be completed: offline practice can never pass.
  - With `ANTHROPIC_API_KEY` set (production), they complete on the first passing session.
