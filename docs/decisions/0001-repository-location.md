# 0001: Build in `sales-tap-tics/` inside the existing repository

- **Context.** The product is named Sales Tap-tics ("tactics" you practice by tapping on a phone). The owner wants
  the repository named `sales-tap-tics`. This session can only write to `requote-insurance-app`, an unrelated
  insurance requoting app, and cannot create or rename GitHub repositories.
- **Decision.** Build the monorepo in a self-contained `sales-tap-tics/` folder on branch `claude/sales-tap-tics`.
  Nothing outside the folder is changed except one CI workflow file. Internal packages use the `@taptics/` scope.
- **Consequence.** Once an empty `sales-tap-tics` repository exists on GitHub, the folder moves there with its
  history: `git subtree split --prefix sales-tap-tics -b tap-tics-only`, then push that branch as `main`.

## Addendum, 2026-10-02: moved to its own repository

The owner asked to move the project out of `requote-insurance-app`. The folder was split with its full history
(`git subtree split --prefix sales-tap-tics`, 23 commits) and its CI workflow moved to `.github/workflows/ci.yml`
at the new root. The copy on branch `claude/sales-tap-tics` of `requote-insurance-app` is frozen.
