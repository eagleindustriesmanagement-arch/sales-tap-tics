/**
 * One-time importer: turns the technique and objection tables in SPEC.md (sections 8 and 9) into one YAML file per
 * item, so the library is data from day one (spec 1.1 item 3). After import the YAML files are the source of truth;
 * this script refuses to overwrite an existing file unless run with --force.
 *
 * Usage: pnpm content:import-spec [--force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { objectionSchema, techniqueSchema, type TechniqueFamily } from "../src/schemas.js";
import { BEHIND_ES, MOVES, SAYS_OVERRIDES, USE_ONLY_WHEN_ES_FALLBACK } from "./spec-drafts.js";
import { NAME_ES, WHEN_ES } from "./spec-drafts-techniques.js";

const here = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(here, "../../../SPEC.md");
const LIBRARY = resolve(here, "../library");
const force = process.argv.includes("--force");

const FAMILY: Record<TechniqueFamily, number[]> = {
  objection_sequence: [1, 2, 3, 4, 5, 13, 32, 57, 69],
  discovery: [6, 7, 8, 24, 25, 33, 38, 56, 60, 80, 82, 84, 90, 103, 104],
  closing: [10, 11, 14, 23, 26, 31, 34, 44, 48, 58, 59, 68, 101, 109],
  negotiation: [9, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 37, 42, 43, 45, 46, 61, 79, 83, 85, 86, 89, 95, 96, 99, 105, 106, 107, 110, 111, 112, 113, 114],
  indecision: [12, 47, 91, 92, 93, 94, 98, 115],
  phone: [35, 36, 62, 63, 64, 75, 76, 77, 78, 88, 102],
  finance_handoff: [49, 50, 51, 74, 97],
  delivery: [71, 116, 117],
  follow_up: [39, 52, 53, 54, 55, 67, 81, 87],
  language_trust: [40, 41, 70, 100, 108],
  ev: [65, 66, 72, 73],
  compliance: [118, 119, 120, 121, 122],
};

const STAGES: Record<TechniqueFamily, string[]> = {
  objection_sequence: ["objection"],
  discovery: ["discovery"],
  closing: ["closing"],
  negotiation: ["numbers", "negotiation"],
  indecision: ["objection", "closing"],
  phone: ["phone"],
  finance_handoff: ["finance"],
  delivery: ["delivery"],
  follow_up: ["follow_up"],
  language_trust: ["greeting", "discovery"],
  ev: ["discovery", "objection"],
  compliance: ["numbers"],
};

/** Spec 8.11: variants linked so the library shows them together. */
const RELATED_GROUPS = [
  [19, 106],
  [30, 85, 118],
  [39, 81],
  [61, 95],
  [20, 107],
  [52, 53, 87],
];

/** Universal rubric items (spec 13.2) each technique feeds. */
const RUBRIC_ITEMS: Record<number, string[]> = {
  1: ["U-PAUSE", "U-PACE"],
  2: ["U-QFIRST"],
  5: ["U-ISOLATE"],
  7: ["U-SUMMARY"],
  14: ["U-NEXT"],
  15: ["U-FIRSTNUM"],
  19: ["U-CONCESS"],
  20: ["U-DEADLINE"],
  23: ["U-ONECLOSE"],
  26: ["U-ONECLOSE"],
  27: ["U-FIRSTNUM"],
  30: ["U-TOTALFIRST"],
  40: ["U-LANG"],
  48: ["U-TIEDOWN"],
  92: ["U-RECOMMEND"],
  93: ["U-LIMIT"],
  103: ["U-ADAPT"],
  105: ["U-PACE"],
  106: ["U-CONCESS"],
  107: ["U-DEADLINE"],
  118: ["U-TOTALFIRST"],
  121: ["PAY-02-present", "offer-choice"],
  122: ["U-NEXT"],
};

/** Rules a technique touches beyond codes named in its row. */
const COMPLIANCE: Record<number, string[]> = {
  15: ["PRICE-01"],
  20: ["DEAD-01"],
  30: ["PRICE-01", "PRICE-05"],
  51: ["ADD-01"],
  74: ["ADD-01", "ADD-04"],
  104: ["ID-01"],
  106: ["AUTH-01"],
  107: ["DEAD-01"],
  116: ["REVIEW-01"],
  118: ["PRICE-01", "PRICE-02"],
  119: ["PRICE-03"],
  120: ["ADD-02"],
  121: ["PAY-01", "PAY-02", "ADD-01"],
  122: ["PRICE-01"],
};

const STORE_POLICY = new Set([53, 79, 120]);

/** Source URLs from spec 23.2, attached only when the evidence note names the source unambiguously. */
const SOURCE_URLS: [RegExp, string][] = [
  [/Gong.*(objection|demos|questions|54\.3)/i, "https://www.gong.io/blog/here-are-the-7-best-objection-handling-techniques-youll-read-this-year"],
  [/Gong, 300 million calls/i, "https://www.gong.io/blog/the-best-and-worst-cold-call-openers-backed-by-data-from-300m-calls"],
  [/JOLT Effect/i, "https://www.jolteffect.com/"],
  [/2025 meta-analysis of 90 studies/i, "https://ink.library.smu.edu.sg/lkcsb_research/7752"],
  [/Mason and others 2013/i, "https://columbia.edu/~da358/publications/Precise_offers.pdf"],
  [/Leonardelli and others 2019/i, "https://www.sciencedirect.com/science/article/pii/S074959781630557X"],
  [/Kim and others 2022/i, "https://myscp.onlinelibrary.wiley.com/doi/abs/10.1002/jcpy.1238"],
  [/Kwon and Weingart 2004/i, "https://pubmed.ncbi.nlm.nih.gov/15065974/"],
  [/Gino and Moore 2008/i, "https://ncmr.lps.library.cmu.edu/article/id/82/"],
  [/Brooks, Dai and Schweitzer 2014/i, "https://www.hbs.edu/ris/Publication%20Files/Brooks%20Dai%20Schweitzer%202013_d2f61dc9-ec1b-485d-a815-2cf25746de50.pdf"],
  [/meta-analysis of 42 studies/i, "https://www.researchgate.net/publication/234839851_A_Meta-Analysis_of_the_Effectiveness_of_the_But_You_Are_Free_Compliance-Gaining_Technique"],
  [/Peck and Shu 2009/i, "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1345908"],
  [/Chernev 2015/i, "https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2014.08.002"],
  [/Gremler and Gwinner 2008/i, "https://www.sciencedirect.com/science/article/abs/pii/S0022435908000511"],
  [/Van Zant and Berger 2020/i, "https://faculty.wharton.upenn.edu/wp-content/uploads/2019/01/Voice-Persuades.pdf"],
  [/Jung and others 2023/i, "https://www.ama.org/2023/01/10/asking-for-customer-reviews-at-the-right-time-sooner-is-not-always-better/"],
  [/s\. 634\.121/i, "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&Search_String=&URL=0600-0699%2F0634%2FSections%2F0634.121.html"],
  [/s\. 501\.976/i, "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599%2F0501%2FSections%2F0501.976.html"],
  [/FTC (2026|pricing guidance)/i, "https://www.ftc.gov/business-guidance/resources/automobile-industry-pricing-transparency-faqs"],
  [/Credit Acceptance consent decree/i, "https://www.ir.creditacceptance.com/static-files/bc0ecc18-3976-42f0-95c6-da2a651aa771"],
  [/J\.D\. Power 2025/i, "https://www.jdpower.com/business/press-releases/2025-us-sales-satisfaction-index-ssi-study/"],
  [/Cox Automotive satisfaction/i, "https://www.coxautoinc.com/news/cox-automotive-unveils-key-insights-into-successful-car-deals-in-new-study-drivers-of-car-shopping-satisfaction/"],
  [/Joe Verde/i, "https://blog.joeverde.com/facts-about-buying-selling/"],
  [/Mark Tewart/i, "https://tewart.com/giving-enough-trade/"],
  [/Jonathan Dawson/i, "https://www.cbtnews.com/mastering-the-i-found-a-better-deal-objection-with-jonathan-dawson/"],
  [/Ali Reda/i, "https://lifelessons.co/personal-development/sales/"],
  [/Ogliastri/i, "https://www.redalyc.org/pdf/716/71602504.pdf"],
  [/FTC Cowboy Toyota/i, "https://advertisinglaw.fkks.com/post/102enu8/ftc-settles-charges-with-car-dealership-over-spanish-language-ads-with-english-di"],
  [/AI-simulator study 2026/i, "https://arxiv.org/abs/2606.20708"],
];

function section(markdown: string, from: string, to: string): string {
  const start = markdown.indexOf(from);
  const end = markdown.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error(`section not found: ${from}`);
  return markdown.slice(start, end);
}

function tableRows(text: string, codePrefix: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.startsWith(`| ${codePrefix}`))
    .map((line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
}

function unquote(value: string): string {
  const v = value.trim();
  return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

function slugify(text: string, words = 5): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, words)
    .join("-");
}

function familyOf(n: number): TechniqueFamily {
  for (const [family, codes] of Object.entries(FAMILY)) if (codes.includes(n)) return family as TechniqueFamily;
  throw new Error(`no family for T${n}`);
}

const code3 = (n: number) => `T${String(n).padStart(3, "0")}`;

/** Splits a trailing "(Only when true.)" note off a quoted model line. */
function splitTrailingNote(line: string): { line: string; note: string | null } {
  const match = line.match(/^"(.*)"\s*\(([^)]+)\)\s*$/);
  if (match) return { line: match[1]!, note: match[2]! };
  return { line: unquote(line), note: null };
}

function parseEvidence(cell: string): { grade: "A" | "B" | "C" | "D"; note: string } {
  const match = cell.match(/^([ABCD])\s*[:;]?\s*(.*)$/);
  if (!match) throw new Error(`bad evidence cell: ${cell}`);
  const note = match[2]!.trim() || "Practitioner tradition; the research named no source";
  return { grade: match[1] as "A" | "B" | "C" | "D", note };
}

function write(path: string, data: unknown): boolean {
  if (existsSync(path) && !force) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(data, { lineWidth: 0 }));
  return true;
}

function importTechniques(markdown: string): number {
  const text = section(markdown, "## 8. Content library: the 122 techniques", "### 8.11 Overlaps");
  const rows = tableRows(text, "T");
  if (rows.length !== 122) throw new Error(`expected 122 technique rows, found ${rows.length}`);
  let written = 0;
  for (const [codeCell, name, when, enLine, esLine, evidenceCell] of rows) {
    const n = Number(codeCell!.slice(1));
    const family = familyOf(n);
    const en = splitTrailingNote(enLine!);
    const es = splitTrailingNote(esLine!);
    const kind = en.line.startsWith("(") && en.line.endsWith(")") ? "direction" : "spoken";
    const strip = (s: string) => (kind === "direction" ? s.replace(/^\(|\)$/g, "") : s);
    const evidence = parseEvidence(evidenceCell!);
    const related = RELATED_GROUPS.filter((g) => g.includes(n)).flatMap((g) => g.filter((x) => x !== n)).map(code3);
    const named = [...`${evidenceCell} ${when}`.matchAll(/\b([A-Z]+-\d{2})\b/g)].map((m) => m[1]!);
    const compliance = [...new Set([...(COMPLIANCE[n] ?? []), ...named])].sort();
    const placeholders = [...new Set([...`${en.line} ${es.line}`.matchAll(/\$([A-Z])\b/g)].map((m) => m[1]!))].sort();
    const sources = SOURCE_URLS.filter(([re]) => re.test(evidenceCell!)).map(([, url]) => url);
    const enNote = en.note ?? (/only (when|usable if) true/i.test(`${when} ${evidenceCell}`) ? "Only when true." : null);
    const esNote = es.note ?? USE_ONLY_WHEN_ES_FALLBACK[code3(n)] ?? (enNote ? "Solo si es cierto." : null);
    const technique = techniqueSchema.parse({
      code: code3(n),
      slug: slugify(name!),
      name: { en: name, es: NAME_ES[code3(n)] },
      family,
      stages: STAGES[family],
      when: { en: when, es: WHEN_ES[code3(n)] },
      model_line_kind: kind,
      model_line: { en: strip(en.line), es: strip(es.line) },
      evidence,
      sources,
      placeholders,
      related,
      rubric_items: RUBRIC_ITEMS[n] ?? [],
      compliance,
      requires_store_policy: STORE_POLICY.has(n),
      use_only_when: enNote ? { en: enNote, es: esNote } : null,
      status: STORE_POLICY.has(n) ? "needs_store_policy" : "active",
    });
    if (write(join(LIBRARY, "techniques", `${technique.code}-${technique.slug}.yaml`), technique)) written += 1;
  }
  return written;
}

function importObjections(markdown: string): number {
  const text = section(markdown, "## 9. Content library: the 65 objections", "## 10. AI customer engine");
  const rows = tableRows(text, "O");
  if (rows.length !== 65) throw new Error(`expected 65 objection rows, found ${rows.length}`);
  const modules: [number, string][] = [
    [18, "car-core"],
    [27, "car-market-2026"],
    [32, "car-ev"],
    [40, "car-language-trust"],
    [50, "car-phone-finance"],
    [65, "car-miami-indecision"],
  ];
  const slugOverride: Record<string, string> = { O01: "talk-to-spouse", O65: "preinstalled-package" };
  let written = 0;
  for (const [code, saysEn, saysEs, behind, moves, r1] of rows) {
    const n = Number(code!.slice(1));
    const override = SAYS_OVERRIDES[code!];
    const behindSource = behind!.match(/\(([^()]*(?:Edmunds|J\.D\. Power|YouGov|iSeeCars)[^()]*)\)\s*$/)?.[1] ?? null;
    const techniques = [...moves!.matchAll(/\bT\d{3}\b/g)].map((m) => m[0]);
    const rules = [...moves!.matchAll(/\b[A-Z]+-\d{2}\b/g)].map((m) => m[0]);
    const seeAlso = [...new Set([...(override?.seeAlso ?? []), ...[...`${saysEn} ${saysEs}`.matchAll(/\bO\d{2}\b/g)].map((m) => m[0])])].filter((c) => c !== code);
    const says = override
      ? { en: override.en, es: override.es }
      : { en: saysEn!.replace(/^\((.*)\)$/, "$1"), es: unquote(saysEs!.split(" / ")[0]!.trim()) + (saysEs!.includes(" / ") ? ` / ${unquote(saysEs!.split(" / ").slice(1).join(" / "))}` : "") };
    const objection = objectionSchema.parse({
      code,
      slug: slugOverride[code!] ?? slugify(says.en || says.es),
      module: modules.find(([max]) => n <= max)![1],
      says: { en: says.en, es: says.es.replace(/^"|"$/g, "") },
      nonverbal: override?.nonverbal ?? false,
      behind: { en: behind, es: BEHIND_ES[code!] },
      behind_source: behindSource,
      core_moves: { techniques, rules, notes: MOVES[code!] ?? null },
      release_1: r1 === "Yes",
      see_also: seeAlso,
      language_specific: override?.languageSpecific ?? null,
    });
    if (write(join(LIBRARY, "objections", `${objection.code}-${objection.slug}.yaml`), objection)) written += 1;
  }
  return written;
}

const markdown = readFileSync(SPEC, "utf8");
const t = importTechniques(markdown);
const o = importObjections(markdown);
console.log(`import-spec: wrote ${t} technique files and ${o} objection files${force ? " (forced)" : ""}`);
