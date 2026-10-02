/**
 * Secret scan (spec 20 security checklist): fails if a tracked file contains something that looks like a live
 * credential. Keys belong in the environment, never in the repository.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS: [string, RegExp][] = [
  ["Anthropic API key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["Resend API key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private key", /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ["database URL with a password", /postgres(ql)?:\/\/[^:\s/]+:[^@\s]{6,}@(?!localhost|127\.0\.0\.1)/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
];

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter((f) => f && !/\.(png|jpg|ico|woff2?|lock)$/.test(f) && !f.endsWith("pnpm-lock.yaml"));
const hits: string[] = [];
for (const f of files) {
  let text: string;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const [name, re] of PATTERNS) if (re.test(text)) hits.push(`${f}: ${name}`);
}
if (hits.length) {
  console.error(`possible secrets in tracked files:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`secret scan: ${files.length} tracked files, nothing found`);
