/**
 * The compliance engine over every content line (spec 4.3 item 6, 7.4): technique model and flawed lines,
 * scenario demonstrations (against the scenario's own facts), behavior-card lines and persona lines.
 * A critical violation blocks CI; major and minor ones are listed for the compliance reviewer.
 */
import { platformLibrary, type BilingualText } from "@taptics/content";
import { checkContentLine, guardCustomerLine, STRICTEST_STORE, type Violation } from "../src/index.js";

const library = platformLibrary();
const base = { facts: null, store: STRICTEST_STORE, channel: "floor" as const, lexicon: library.lexicon!, rules: [...library.rules.values()], techniques: library.techniques };
let critical = 0;
let other = 0;

function report(where: string, violations: Violation[], allowed: string[] = []) {
  for (const v of violations) {
    if (allowed.includes(v.rule)) continue;
    const line = `${v.severity.padEnd(8)} ${where} ${v.rule}: "${v.span.text}" — ${v.explanation.en}`;
    if (v.severity === "critical") {
      critical += 1;
      console.error(line);
    } else {
      other += 1;
      if (process.argv.includes("--verbose")) console.warn(line);
    }
  }
}

for (const t of library.techniques.values()) {
  report(`${t.code} model_line`, checkContentLine(t.model_line, base));
  if (t.flawed_line) {
    const v = checkContentLine(t.flawed_line, base);
    report(`${t.code} flawed_line`, v, t.flawed_line_violates);
    for (const rule of t.flawed_line_violates) {
      if (!v.some((x) => x.rule === rule)) console.warn(`warning  ${t.code} flawed_line is meant to break ${rule} but the engine does not flag it`);
    }
  }
}

for (const s of library.scenarios.values()) {
  const ctx = { ...base, facts: s.facts, channel: s.channel };
  for (const kind of ["good", "flawed"] as const) {
    const demo = s.demonstrations[kind];
    const n = Math.min(demo.script.en.length, demo.script.es.length);
    if (demo.script.en.length !== demo.script.es.length) console.error(`error    ${s.code} ${kind} demo has ${demo.script.en.length} English and ${demo.script.es.length} Spanish lines`), (critical += 1);
    for (let i = 0; i < n; i += 1) {
      const en = demo.script.en[i]!;
      const es = demo.script.es[i]!;
      const line: BilingualText = { en: en.text, es: es.text };
      if (en.speaker === "rep") report(`${s.code} ${kind} demo line ${i + 1}`, checkContentLine(line, ctx));
      else {
        for (const [lang, text] of [["en", en.text], ["es", es.text]] as const) {
          const issues = guardCustomerLine({ text, language: lang, facts: s.facts, lexicon: library.lexicon!, hiddenTruthMarkers: { en: [], es: [] }, hiddenUnlocked: true });
          for (const issue of issues) {
            critical += 1;
            console.error(`critical ${s.code} ${kind} demo line ${i + 1} (${lang}) customer ${issue.kind}: "${issue.span.text}"`);
          }
        }
      }
    }
  }
  const persona = library.personas.get(s.persona);
  if (persona) {
    for (const lang of ["en", "es"] as const) {
      const issues = guardCustomerLine({ text: persona.stated_line[lang], language: lang, facts: s.facts, lexicon: library.lexicon!, hiddenTruthMarkers: persona.hidden_truth_markers, hiddenUnlocked: false });
      for (const issue of issues) {
        critical += 1;
        console.error(`critical ${persona.code} stated_line (${lang}) ${issue.kind}: "${issue.span.text}"`);
      }
    }
  }
}

for (const c of library.behaviorCards.values()) {
  report(`${c.code} line`, checkContentLine(c.floor_check_script.line, base));
}

console.log(`compliance: ${critical} critical (blocking), ${other} major/minor${process.argv.includes("--verbose") ? "" : " (--verbose to list)"}`);
process.exit(critical > 0 ? 1 : 0);
