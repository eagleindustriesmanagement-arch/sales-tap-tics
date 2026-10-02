/**
 * The compliance suite (spec 21.2): runs every labeled case and reports missed violations and false positives per
 * rule, per language and per split. Exit code 1 when results regress past the ratchet in suite/baseline.json.
 *
 *   pnpm compliance:suite                    deterministic layer
 *   pnpm compliance:suite --with-classifier  both layers (needs ANTHROPIC_API_KEY)
 *   pnpm compliance:suite --show=dev         list dev failures (never holdout: it is not tuned against)
 *   pnpm compliance:suite --update-baseline  record current results as the ratchet
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platformLibrary } from "@taptics/content";
import { checkUtteranceFull, NullClassifier, STRICTEST_STORE, type ComplianceClassifier } from "@taptics/rules";
import { loadSuite, metrics, outcome, runCase, suiteFacts, type CaseOutcome } from "@taptics/rules/suite";
import { AiClient, ClaudeComplianceClassifier } from "../src/index.js";

const SUITE = join(dirname(fileURLToPath(import.meta.url)), "../../rules/test/suite");
const args = process.argv.slice(2);
const withClassifier = args.includes("--with-classifier");
const show = args.find((a) => a.startsWith("--show="))?.split("=")[1];

const library = platformLibrary();
const { cases, errors } = loadSuite(SUITE);
if (errors.length) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
const base = { store: STRICTEST_STORE, lexicon: library.lexicon!, rules: [...library.rules.values()], techniques: library.techniques };
let classifier: ComplianceClassifier = new NullClassifier();
if (withClassifier) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("--with-classifier needs ANTHROPIC_API_KEY");
    process.exit(1);
  }
  classifier = new ClaudeComplianceClassifier(new AiClient(), "suite");
}

const outcomes: CaseOutcome[] = [];
for (const c of cases) {
  let violations = runCase(c, base);
  if (withClassifier && c.text) {
    const ctx = { ...base, facts: suiteFacts(c.variant), channel: c.channel, offerLanguage: c.offer_language ?? c.lang, finance: c.finance };
    violations = await checkUtteranceFull({ text: c.text, language: c.lang, speaker: c.speaker, turnIndex: 0 }, ctx, classifier, { classifierTimeoutMs: 20_000 });
  }
  outcomes.push(outcome(c, violations));
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const line = (label: string, o: CaseOutcome[]) => {
  const m = metrics(o, library.rules);
  return `${label.padEnd(22)} ${String(m.cases).padStart(4)} cases  critical misses ${String(m.criticalMisses).padStart(3)}  all misses ${String(m.misses).padStart(3)}/${String(m.expectedFirings).padEnd(4)} false positives ${String(m.falsePositiveCases).padStart(3)} (${pct(m.falsePositiveRate)})`;
};
console.log(`Compliance suite, ${withClassifier ? "both layers" : "deterministic layer only"}\n`);
console.log(line("all", outcomes));
for (const split of ["dev", "holdout"] as const) console.log(line(split, outcomes.filter((o) => o.split === split)));
for (const lang of ["en", "es"] as const) console.log(line(`language ${lang}`, outcomes.filter((o) => o.c.lang === lang)));
console.log("\nBy rule (cases written for it):");
const focuses = [...new Set(outcomes.map((o) => o.c.rule_focus))].sort();
for (const f of focuses) console.log(line(`  ${f}`, outcomes.filter((o) => o.c.rule_focus === f)));

if (show === "dev") {
  console.log("\nDev failures:");
  for (const o of outcomes.filter((x) => x.split === "dev" && (x.missed.length || x.unexpected.length))) {
    console.log(`- ${o.c.id} [${o.c.lang} ${o.c.kind}] missed=${o.missed.join(",") || "-"} unexpected=${o.unexpected.join(",") || "-"}\n    ${o.c.text ?? o.c.turns!.join(" | ")}`);
  }
}

// Ratchet: results may only get better (decision 0008).
const baselinePath = join(SUITE, withClassifier ? "baseline-both.json" : "baseline-deterministic.json");
const current = Object.fromEntries((["dev", "holdout"] as const).map((s) => [s, metrics(outcomes.filter((o) => o.split === s), library.rules)]));
if (args.includes("--update-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify({ cases: cases.length, ...current }, null, 2)}\n`);
  console.log(`\nbaseline written to ${baselinePath}`);
} else if (existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const worse = (["dev", "holdout"] as const).filter((s) => current[s]!.criticalMisses > baseline[s].criticalMisses || current[s]!.misses > baseline[s].misses || current[s]!.falsePositiveCases > baseline[s].falsePositiveCases);
  if (worse.length) {
    console.error(`\nREGRESSION against ${baselinePath} in: ${worse.join(", ")}`);
    process.exit(1);
  }
  console.log("\nno regression against the baseline");
}
