# 0034: Sales is a loose game; the only hard line is honesty

- **Context.** The owner: "Sales is a loose game and the winner is the one that's able to find the most tricks."
  Creative, honest selling must never be penalized; the hard line is actual dishonesty (lies, made-up numbers, fake
  offers). An audit found the compliance rules already agreed: 38 classic honest tricks in English and Spanish
  (assumptive and alternative closes, trial closes, social proof, takeaways, flattery, future pacing, "let me ask my
  manager" with no fake limit) raise no violation, and only a confident *critical* violation zeroes a score. The
  problem was the scenario automatic-fail list: of its 255 conditions, 28 zeroed the attempt for moves that deceive
  no one (running down a competitor, belittling a partner, persistence after a no, "most people take it"), and 6 more
  mixed such a move with a real lie in one condition.
- **Decision.**
  - **Two kinds of automatic-fail condition.** `kind: honesty` (the default) still zeroes the attempt: a false fact,
    a made-up number, a fake offer or deadline, a promise the rep cannot keep, hiding a term in the payment, getting a
    signature on terms the customer does not understand, blocking the exit, or steering by name, look or language
    (illegal discrimination). `kind: coaching` is a move that costs the customer but deceives no one. The judge still
    reports it, the debrief names it as "A note for next time (no points lost)", and the score does not change.
  - **Mixed conditions were split.** "Ran down the other dealer *or* called their quote fake without proof" became a
    coaching note (ran them down) and an honesty fail (claimed, without proof, that the quote was fake).
  - **The judge is told.** Judge prompt version 2: tricks are good selling when every fact in them is true, a bold or
    persuasive move is never marked down, and an ambiguous line is read as honest persuasion.
  - **A guard.** `packages/rules/test/honest-tricks.test.ts` fails if any rule starts flagging the 38 honest tricks.
- **Not changed.** The 26 deterministic rules and the compliance corpus are unchanged; the suite shows no regression.
  Customers still react like people: a third push after two refusals, or a "trust me", raises the chance they walk.
  That is the game's realism, not a penalty on the score.
