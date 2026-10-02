import { resolve } from "node:path";
import type { NextConfig } from "next";

const root = resolve(process.cwd(), "../..");

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@taptics/ai", "@taptics/content", "@taptics/engine", "@taptics/i18n", "@taptics/rules", "@taptics/scoring", "@taptics/session"],
  env: {
    TAPTICS_CONTENT_DIR: process.env.TAPTICS_CONTENT_DIR ?? resolve(root, "packages/content/library"),
    TAPTICS_PROMPTS_DIR: process.env.TAPTICS_PROMPTS_DIR ?? resolve(root, "packages/ai/prompts"),
  },
  outputFileTracingRoot: root,
  outputFileTracingIncludes: { "/**": ["../../packages/content/library/**/*", "../../packages/ai/prompts/**/*"] },
  poweredByHeader: false,
  // The workspace packages use NodeNext-style "./x.js" specifiers for TypeScript files.
  webpack(cfg) {
    cfg.resolve ??= {};
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return cfg;
  },
};

export default config;
