import { resolve } from "node:path";
import type { NextConfig } from "next";

const root = resolve(process.cwd(), "../..");

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  serverExternalPackages: ["pg"],
  transpilePackages: ["@taptics/ai", "@taptics/db", "@taptics/content", "@taptics/engine", "@taptics/i18n", "@taptics/rules", "@taptics/scoring", "@taptics/session", "@taptics/voice"],
  // The content library and prompts are read at run time from the traced files below; their paths are resolved
  // where the code runs (packages/content/src/loader.ts), never baked in from the build machine.
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
