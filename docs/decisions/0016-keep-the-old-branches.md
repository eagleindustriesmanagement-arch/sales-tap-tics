# 0016: Keep the two leftover branches in requote-insurance-app

- **Context.** The project was first built inside the unrelated `requote-insurance-app` repository and later moved
  to its own repository, `sales-tap-tics` (decision 0001, addendum). Two branches from that period remain in
  `requote-insurance-app`: `claude/sales-tap-tics` (the original build, frozen at 1fad59d) and
  `sales-tap-tics-standalone` (the subtree split used for the move, at c7703c6). Both are history only; all work
  continues on `main` and `claude/next` of `sales-tap-tics`.
- **Decision.** On 2026-10-03 Ernesto decided to keep both branches for now. Nothing is deleted.
- **Consequence.** Nobody builds on them. Deleting them later is the owner's call; `sales-tap-tics` already holds
  the full history, so deleting them would lose nothing.
