import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "services/*/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/rules/src/**", "packages/scoring/src/**", "packages/content/src/**", "packages/engine/src/**"],
      thresholds: { lines: 80 },
    },
  },
});
