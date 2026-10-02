# 0009: Attorney review is not a launch blocker for the internal training tool

- **Context.** The spec (sections 4, 4.5, 20 and 23.1) asks a Florida dealer attorney to review the rulebook and the
  store settings before launch. The app trains salespeople by role-play with an AI customer; it does not talk to real
  customers, quote real deals or send messages to anyone outside the store.
- **Decision (Ernesto, 2026-10-02).** "I don't think we need the dealer attorney review — just do your best to verify
  that, but right now this isn't something that's going to be dealing directly with customers; it's dealing with
  salesmen, so it's fine." So:
  1. Attorney review is removed from the launch blockers.
  2. Every rule keeps its strictest version (spec 4.5). Where the law is unclear, the app teaches the safer line.
  3. The rules are self-verified against the sources the spec cites; the findings and any corrections are in
     `docs/compliance/rule-verification.md`.
  4. Each rule keeps `attorney_reviewed: false`, which stays true until an attorney actually reviews it. The app
     keeps its notice that it is a training tool, not legal advice.
- **Consequence.** Launch for internal training does not wait on outside counsel. What a strict rule costs is a rep
  being coached toward a more careful line than the law requires, which is acceptable in training. What a wrong rule
  costs is a rep learning something false, so self-verification fixes any rule whose stated fact is wrong.
- **Revisit before** any pilot in which the app's output reaches real customers (scripts sent to customers, texts,
  quotes), any use of practice recordings outside the store, or any change to the store-specific legal settings
  listed in spec 4.5 and 23.1 (government charges, pre-delivery fee wording, add-on remedy, referral rewards, consent
  wording, Credit Acceptance terms, the equal-treatment rule). Those settings still require the compliance reviewer's
  sign-off in the app.
