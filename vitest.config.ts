import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 65 scenarios played in two languages: a busy runner can take longer than the 5 s default on a file's first test.
    testTimeout: 20_000,
    include: ["packages/*/test/**/*.test.ts", "services/*/test/**/*.test.ts", "apps/web/test/**/*.test.ts"],
    // Spec 21.1: 80% line coverage on the rule engine, scoring and content (`pnpm test:coverage`, run in CI).
    coverage: {
      provider: "v8",
      include: ["packages/rules/src/**", "packages/scoring/src/**", "packages/content/src/**", "packages/engine/src/**"],
      thresholds: { lines: 80 },
    },
  },
});
