/**
 * Spanish audit (docs/spanish-style-guide.md): runs the guide's checklist over every Spanish string the app shows,
 * the public pages' copy and the content library, and writes a report. It changes nothing.
 *   (cd apps/web && npx tsx scripts/spanish-audit.ts)
 */
import { platformLibrary } from "@taptics/content";
import { STRINGS } from "@taptics/i18n";
import { copy } from "../components/marketing/copy.ts";
import { pricingCopy } from "../components/marketing/pricing-copy.ts";

type Row = { where: string; en: string; es: string };
const rows: Row[] = [];
const walk = (where: string, node: unknown) => {
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (typeof o.en === "string" && typeof o.es === "string") return void rows.push({ where, en: o.en, es: o.es });
  if (Array.isArray(o.en) && Array.isArray(o.es)) {
    (o.es as unknown[]).forEach((x, i) => typeof x === "string" ? rows.push({ where: `${where}[${i}]`, en: String((o.en as unknown[])[i] ?? ""), es: x }) : walk(`${where}[${i}]`, { en: (o.en as unknown[])[i], es: x }));
    return;
  }
  for (const [k, v] of Object.entries(o)) walk(where ? `${where}.${k}` : k, v);
};
for (const [k, v] of Object.entries(STRINGS)) rows.push({ where: `ui:${k}`, en: (v as { en: string }).en, es: (v as { es: string }).es });
walk("home", copy);
walk("pricing", pricingCopy);
const lib = platformLibrary();
for (const [kind, map] of Object.entries({ scenario: lib.scenarios, persona: lib.personas, lesson: lib.lessons, technique: lib.techniques, objection: lib.objections, rule: lib.rules, card: lib.behaviorCards }))
  for (const [code, item] of (map as Map<string, unknown>)) walk(`${kind}:${code}`, item);

// Matchers (cue patterns, markers, aliases) are not text anyone reads: skipped.
const isMatcher = (r: Row) => /\.(cues|patterns|markers|hidden_truth_markers|aliases|approval_claims|zero_rate_claims|rate_cues|free_words|term_disclosure)\b/.test(r.where) || /\\[bdsw]|\(\?|\|/.test(r.es);
/** A whole-word match that understands accents and ñ (a plain \b treats "ñ" as a boundary: "años" would hold "os"). */
const word = (alts: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`, "iu");
const area = (w: string) => (w.startsWith("ui:") ? "interface" : w.startsWith("home") || w.startsWith("pricing") ? "public pages" : "content");
const checks: { id: string; title: string; test: (r: Row) => string | null; scope?: (r: Row) => boolean }[] = [
  { id: "tu", title: "tú where the guide says usted (interface and rep lines)", scope: (r) => area(r.where) !== "content" || /speaker|rep|say|model_line|flawed|script|lesson|technique/.test(r.where),
    test: (r) => r.es.match(word("tú|tienes|puedes|quieres|necesitas|sabes|eres|estás|vas a|elige|escribe|empieza|dime|dale"))?.[0] ?? null },
  { id: "spain", title: "Spain-only vocabulary", test: (r) => r.es.match(word("coches?|ordenador(es)?|m[oó]vil(es)?|vosotros|os|conducir|aparcar|neum[aá]ticos?"))?.[0] ?? r.es.match(/(?:^|[.¡!]\s*)[Vv]ale[.,!]/u)?.[0] ?? null },
  { id: "false-friends", title: "False friends", test: (r) => r.es.match(word("aplicar para|aplicó para|realiz(ar|ó|a)|soport(ar|a)|asistir|actualmente|eventualmente|introduc(ir|e)|librer[ií]a|marcador"))?.[0] ?? null },
  { id: "glossary", title: "Glossary deviations", test: (r) => r.es.match(word("puntuaci[oó]n|tablero|juego de roles|asignaci[oó]n(es)?|chequeos?|tarjetas?|intente de nuevo|algo fall[oó]|ajustes|role-?play|resumen"))?.[0] ?? null },
  { id: "tone", title: "Stiff or formal words the guide replaces (iniciar, utilizar, realizar, por favor)", scope: (r) => area(r.where) !== "content",
    test: (r) => r.es.match(word("iniciar(?! sesi[oó]n)|utiliz\\p{L}+|por favor|estimad[oa]"))?.[0] ?? null },
  { id: "title-case", title: "Title Case headings", scope: (r) => r.es.split(/\s+/).length >= 3 && r.es.length < 70,
    test: (r) => { const w = r.es.split(/\s+/).slice(1).filter((x) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}/.test(x) && !/^(Miami|Sales|Taptics|Chevrolet|Equinox|Trax|Blazer|Malibu|Colorado|Tahoe|Silverado|FTC|APR|Kendall|Hialeah|Doral|Brickell|Homestead|Westchester|Ceiba|Cayo|Verde|Lumacay|Kestrela|Gong|Rackham|Dixon|Adamson|Harvard|Business|Review|Prada|Rucci|Urzúa|Neil|JOLT|Effect|Carlos|Luis|Ana|Marta)/.test(x)); return w.length >= 2 ? w.join(" ") : null; } },
  { id: "punctuation", title: "Question or exclamation without the opening ¿ or ¡", test: (r) => {
      const s = r.es.replace(/\{[^}]*\}/g, "");
      if (/\?/.test(s) && !/¿/.test(s)) return "?";
      if (/!/.test(s) && !/¡/.test(s)) return "!";
      return null;
    } },
  { id: "plural", title: "A count next to a fixed plural (\"1 sesiones\" risk)", scope: (r) => area(r.where) !== "content",
    test: (r) => r.es.match(/\{(n|count|days|weeks|sessions|minutes|seconds|left|total)\}\s+[a-záéíóúñ]+(es|s)\b/i)?.[0] ?? null },
];
const results = checks.map((c) => ({ c, hits: rows.filter((r) => !isMatcher(r) && (!c.scope || c.scope(r))).map((r) => ({ r, hit: c.test(r) })).filter((x) => x.hit) }));
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 160);
console.log(`Strings checked: ${rows.length} (interface ${rows.filter((r) => area(r.where) === "interface").length}, public pages ${rows.filter((r) => area(r.where) === "public pages").length}, content ${rows.filter((r) => area(r.where) === "content").length}).\n`);
console.log("| Check | Interface | Public pages | Content |\n| --- | --- | --- | --- |");
for (const { c, hits } of results) console.log(`| ${c.title} | ${["interface", "public pages", "content"].map((a) => hits.filter((h) => area(h.r.where) === a).length).join(" | ")} |`);
for (const { c, hits } of results) {
  if (!hits.length) continue;
  console.log(`\n### ${c.title} (${hits.length})\n\n| Where | Found | Spanish |\n| --- | --- | --- |`);
  for (const h of hits.slice(0, 25)) console.log(`| ${esc(h.r.where)} | ${esc(h.hit!)} | ${esc(h.r.es)} |`);
  if (hits.length > 25) console.log(`\n…and ${hits.length - 25} more.`);
}
