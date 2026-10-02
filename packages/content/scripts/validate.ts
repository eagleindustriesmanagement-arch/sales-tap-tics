/**
 * Content CI (spec 7.4): schemas, bilingual completeness, cross-references.
 * The compliance pass over every line runs next, from packages/rules/scripts/check-content.ts.
 */
import { crossReference, loadLibrary } from "../src/index.js";

const { library, errors } = loadLibrary();
for (const e of errors) console.error(`error   ${e.file}: ${e.message}`);
const findings = errors.length === 0 ? crossReference(library) : [];
const verbose = process.argv.includes("--verbose");
const warnings = findings.filter((f) => f.level === "warning");
for (const f of findings.filter((x) => x.level === "error")) console.error(`error   ${f.item}: ${f.message}`);
if (verbose) for (const f of warnings) console.warn(`warning ${f.item}: ${f.message}`);
const errorCount = errors.length + findings.filter((f) => f.level === "error").length;
console.log(
  `content: ${library.techniques.size} techniques, ${library.objections.size} objections, ${library.personas.size} personas, ` +
    `${library.scenarios.size} scenarios, ${library.rubrics.size} rubrics, ${library.rules.size} rules, ${library.behaviorCards.size} behavior cards; ` +
    `${errorCount} errors, ${warnings.length} warnings${verbose ? "" : " (--verbose to list)"}`,
);
process.exit(errorCount > 0 ? 1 : 0);
