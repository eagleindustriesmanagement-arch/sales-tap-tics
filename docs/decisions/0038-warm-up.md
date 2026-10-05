# 0038: Warm-up, a 3-minute drill on one behavior

- **Context.** Spec 12.5 and 15.2 define a warm-up: a 3-minute quick drill on one technique for the start of a
  shift, optional, scored on a single rubric item, with only its completion visible to the manager. The database
  allowed the mode from the start; nothing used it.
- **Decision.**
  - **What it drills.** The rep's weakest practiced behavior (lowest mastery, spec 15.3), on the customer they have
    gone longest without; a rep with no history drills the first behavior of their first onboarding customer
    (`pickWarmUp`, packages/session). Only scenario items tied to a technique and not measured by voice alone (the
    pause) can be drilled, so a typed warm-up can always score it. Industry-aware, like the daily plan.
  - **Where.** A card on Today ("Start of your shift? Warm up in 3 minutes"), under the day's real session. It
    opens the practice room straight on the briefing (no lesson), which names the behavior, its technique and the
    technique's model line.
  - **How long.** Three minutes on a visible clock, or four replies, whichever comes first; then it scores itself.
    The customer never walks out of a warm-up (the engine already turned exits off for this mode).
  - **Scoring.** The session is scored as usual, then narrowed to the drilled item (`focusOn`, packages/scoring):
    one item, always partial and never a pass, so it counts toward no certification, no assignment and no failed
    lesson, but the item's mastery learns from it. Honesty stays the hard line: a confident critical violation
    zeroes the drill and is shown. The debrief's one change is the drilled behavior.
  - **Who sees what.** The rep sees how the behavior went and the line to try on the floor. Lists show "Warm-up
    done" instead of a score, for everyone; a manager who opens one sees only that it was done (spec 12.5). The
    score row itself stays readable under the existing row-level security; the screens do not show it.
  - **Daily goal.** A warm-up keeps the streak alive but does not meet the daily goal, which is a real session.
  - **Storage.** `sessions.focus_item` (migration 0023, nullable, only for warm-ups) keeps the drilled item, so a
    session rebuilt on another server instance narrows to the same one.
- **Spanish.** New interface lines (`warmup.*`) are drafts in usted, for the Miami reviewer with the next batch.
- **Proof.** Unit tests: the pick (first, weakest, moves on once practiced), the narrowed score, honesty still
  zeroing. Browser test: Today's card, the briefing, the clock, a typed turn, the result, the stored session
  (warm-up mode, focus item, one item, partial, not passed), the rep's history tag, and the manager's team list and
  completion-only view.
