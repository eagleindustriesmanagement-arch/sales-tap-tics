import { resolve } from "node:path";
import type { NextConfig } from "next";

const root = resolve(process.cwd(), "../..");

/**
 * Security headers on every response (spec 20.2, decision 0037). The policy keeps every script, style, font, image
 * and request on this site: the browser never talks to a model, speech or email provider directly, so nothing else
 * needs to be allowed. Inline scripts stay allowed because Next.js streams its page data in them; what the policy
 * blocks is anything loaded from or sent to another origin, framing by another site, and plugins. The sound
 * check's beep is a data: URL, so media allows data:. Development adds 'unsafe-eval' for React's fast refresh.
 */
const dev = process.env.NODE_ENV !== "production";
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // Two years, every subdomain: the site is HTTPS-only (Vercel redirects plain HTTP).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // An invite link carries its token in the path: another site gets only our origin, never the path.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone is for this site's practice room only; nothing here needs a camera, location or payments.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Workspace packages ship TypeScript source.
  serverExternalPackages: ["pg"],
  transpilePackages: ["@taptics/ai", "@taptics/db", "@taptics/content", "@taptics/engine", "@taptics/i18n", "@taptics/rules", "@taptics/scoring", "@taptics/session", "@taptics/voice"],
  // The content library and prompts are read at run time from the traced files below; their paths are resolved
  // where the code runs (packages/content/src/loader.ts), never baked in from the build machine.
  outputFileTracingRoot: root,
  outputFileTracingIncludes: { "/**": ["../../packages/content/library/**/*", "../../packages/ai/prompts/**/*"] },
  poweredByHeader: false,
  // The build this bundle came from (October 4): a phone still running yesterday's code sees the server's newer build
  // and reloads (components/update-check.tsx).
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.TAPTICS_BUILD_ID ?? `local-${Date.now()}` },
  // The workspace packages use NodeNext-style "./x.js" specifiers for TypeScript files.
  webpack(cfg) {
    cfg.resolve ??= {};
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return cfg;
  },
};

export default config;
