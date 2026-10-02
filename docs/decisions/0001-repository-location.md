# 0001: Build in `sales-tap-tics/` inside the existing repository

- **Context.** The product is named Sales Tap-tics ("tactics" you practice by tapping on a phone). The owner wants
  the repository named `sales-tap-tics`. This session can only write to `requote-insurance-app`, an unrelated
  insurance requoting app, and cannot create or rename GitHub repositories.
- **Decision.** Build the monorepo in a self-contained `sales-tap-tics/` folder on branch `claude/sales-tap-tics`.
  Nothing outside the folder is changed except one CI workflow file. Internal packages use the `@taptics/` scope.
- **Consequence.** Once an empty `sales-tap-tics` repository exists on GitHub, the folder moves there with its
  history: `git subtree split --prefix sales-tap-tics -b tap-tics-only`, then push that branch as `main`.
