import type { Library } from "./loader.js";

/** One reviewable line: English and Spanish side by side (spec 16.3). */
export interface ReviewLine {
  key: string;
  kind: "scenario" | "persona";
  code: string;
  /** Who says it, which decides the compliance check: a rep line, a customer line, or text on screen. */
  speaker: "rep" | "customer" | "text";
  en: string;
  es: string;
  /** Lines with numbers, fees or conditions also need the compliance reviewer (spec 16.3 item 3). */
  needsCompliance: boolean;
}

const NUMERIC = /\d|\$|\b(mil|cien|ciento|doscientos|quinientos|percent|por ciento|dólares|dollars)\b/i;

/** Every Spanish line of a release 1 scenario and its persona, in reading order. */
export function reviewLines(library: Library, scenarioCode: string): ReviewLine[] {
  const s = library.scenarios.get(scenarioCode);
  if (!s) return [];
  const p = library.personas.get(s.persona);
  const out: ReviewLine[] = [];
  const add = (kind: ReviewLine["kind"], code: string, key: string, speaker: ReviewLine["speaker"], en: string, es: string) =>
    out.push({ key, kind, code, speaker, en, es, needsCompliance: NUMERIC.test(en) || NUMERIC.test(es) });
  add("scenario", s.code, "title", "text", s.title.en, s.title.es);
  add("scenario", s.code, "setting", "text", s.setting.en, s.setting.es);
  add("scenario", s.code, "pre_brief", "text", s.pre_brief.en, s.pre_brief.es);
  add("scenario", s.code, "opening", "customer", s.opening.en, s.opening.es);
  for (const kind of ["flawed", "good"] as const) {
    const demo = s.demonstrations[kind];
    add("scenario", s.code, `demo.${kind}.notice`, "text", demo.notice.en, demo.notice.es);
    demo.script.en.forEach((line, i) => {
      const es = demo.script.es[i];
      if (es) add("scenario", s.code, `demo.${kind}.${i}`, line.speaker === "rep" ? "rep" : "customer", line.text, es.text);
    });
  }
  for (const item of s.scoring?.items ?? []) add("scenario", s.code, `scoring.${item.code}`, "text", item.behavior.en, item.behavior.es);
  if (p) {
    add("persona", p.code, "stated_line", "customer", p.stated_line.en, p.stated_line.es);
    add("persona", p.code, "hidden_truth", "text", p.hidden_truth.en, p.hidden_truth.es);
    const o = p.offline_lines;
    if (o) {
      o.deflect.forEach((l, i) => add("persona", p.code, `offline.deflect.${i}`, "customer", l.en, l.es));
      for (const k of ["hint", "after_hint", "reveal", "agree_next_step", "not_now", "walk_away", "goodbye", "react_to_pressure"] as const) {
        add("persona", p.code, `offline.${k}`, "customer", o[k].en, o[k].es);
      }
      o.after_reveal.forEach((l, i) => add("persona", p.code, `offline.after_reveal.${i}`, "customer", l.en, l.es));
    }
  }
  return out;
}

/** A review decision, as far as status needs it (decision 0010). */
export interface ReviewDecision {
  enText: string;
  esOriginal: string;
  esFinal: string;
  needsCompliance: boolean;
  complianceBy: string | null;
}

export type LineStatus = "unreviewed" | "approved" | "needs_compliance" | "stale";

/** A review counts only while the texts still match; after write-back the YAML carries the edited Spanish. */
export function lineStatus(line: ReviewLine, review: ReviewDecision | undefined): LineStatus {
  if (!review) return "unreviewed";
  const current = review.enText === line.en && (review.esOriginal === line.es || review.esFinal === line.es);
  if (!current) return "stale";
  if (review.needsCompliance && !review.complianceBy) return "needs_compliance";
  return "approved";
}

/** Where a line's Spanish lives in its YAML file. */
export function yamlPath(library: Library, line: ReviewLine): (string | number)[] {
  const k = line.key.split(".");
  if (line.kind === "scenario") {
    if (k[0] === "demo") return k[2] === "notice" ? ["demonstrations", k[1]!, "notice", "es"] : ["demonstrations", k[1]!, "script", "es", Number(k[2]), "text"];
    if (k[0] === "scoring") {
      const items = library.scenarios.get(line.code)!.scoring!.items;
      return ["scoring", "items", items.findIndex((i) => i.code === k[1]), "behavior", "es"];
    }
    return [line.key, "es"];
  }
  if (k[0] === "offline") return k.length === 3 ? ["offline_lines", k[1]!, Number(k[2]), "es"] : ["offline_lines", k[1]!, "es"];
  return [line.key, "es"];
}
