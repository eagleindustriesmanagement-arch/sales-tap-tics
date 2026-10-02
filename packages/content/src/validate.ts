import type { Library } from "./loader.js";

export interface Finding {
  level: "error" | "warning";
  item: string;
  message: string;
}

const UNIVERSAL_ITEM = /^(U|OBJ|PH|FIN|DEL)-[A-Z]+$|^PAY-02-present$|^offer-choice$/;

/** Rubric items available for a rubric, following `extends`. */
export function rubricItems(library: Library, code: string, seen = new Set<string>()): string[] {
  const rubric = library.rubrics.get(code);
  if (!rubric || seen.has(code)) return [];
  seen.add(code);
  return [...rubric.items.map((i) => i.code), ...(rubric.extends ? rubricItems(library, rubric.extends, seen) : [])];
}

function regexOk(pattern: string): boolean {
  try {
    new RegExp(pattern.replace(/\\b/g, ""), "iu");
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks that content references resolve and that what a scenario needs at runtime is present (spec 7.4).
 * Schema validity and bilingual completeness are already enforced by the loader.
 */
export function crossReference(library: Library): Finding[] {
  const out: Finding[] = [];
  const err = (item: string, message: string) => out.push({ level: "error", item, message });
  const warn = (item: string, message: string) => out.push({ level: "warning", item, message });
  const technique = (code: string) => library.techniques.has(code);

  for (const t of library.techniques.values()) {
    for (const r of t.related) {
      if (!technique(r)) err(t.code, `related technique ${r} does not exist`);
      else if (!library.techniques.get(r)!.related.includes(t.code)) err(t.code, `related link to ${r} is not mutual`);
    }
    for (const r of t.compliance) if (!library.rules.has(r)) err(t.code, `compliance rule ${r} does not exist`);
    for (const f of t.flawed_line_violates) if (!library.rules.has(f)) err(t.code, `flawed_line_violates ${f} does not exist`);
    for (const item of t.rubric_items) if (!UNIVERSAL_ITEM.test(item)) warn(t.code, `rubric item ${item} is not a known item code`);
    if (t.placeholders.length > 0) warn(t.code, `placeholders ${t.placeholders.join(", ")} need bindings to scenario facts before use in a scenario`);
  }

  for (const o of library.objections.values()) {
    for (const c of o.core_moves.techniques) if (!technique(c)) err(o.code, `core move ${c} does not exist`);
    for (const r of o.core_moves.rules) if (!library.rules.has(r)) err(o.code, `core rule ${r} does not exist`);
    for (const s of o.see_also) if (!library.objections.has(s)) err(o.code, `see_also ${s} does not exist`);
  }

  for (const p of library.personas.values()) {
    if (!library.objections.has(p.stated_objection)) err(p.code, `stated objection ${p.stated_objection} does not exist`);
    for (const c of [...p.unlock_conditions, ...p.walk_out_triggers]) {
      for (const cue of [...c.cues.en, ...c.cues.es]) if (!regexOk(cue)) err(p.code, `cue for ${c.code} is not a valid pattern: ${cue}`);
    }
    for (const m of [...p.hidden_truth_markers.en, ...p.hidden_truth_markers.es]) if (!regexOk(m)) err(p.code, `hidden truth marker is not a valid pattern: ${m}`);
    if (p.name_pool.en.length === 0 || p.name_pool.es.length === 0) err(p.code, "name pool needs names in both languages");
  }

  for (const s of library.scenarios.values()) {
    const persona = library.personas.get(s.persona);
    if (!persona) err(s.code, `persona ${s.persona} does not exist`);
    else {
      if (persona.stated_objection !== s.objection) err(s.code, `persona states ${persona.stated_objection} but scenario is ${s.objection}`);
      if (persona.difficulty !== s.difficulty) warn(s.code, `persona difficulty ${persona.difficulty} differs from scenario difficulty ${s.difficulty}`);
      for (const key of Object.keys(persona.variation.amount_ranges)) {
        if (!(key in s.facts.customer_knows)) err(s.code, `persona varies ${key}, which is not in facts.customer_knows`);
      }
    }
    if (!library.objections.has(s.objection)) err(s.code, `objection ${s.objection} does not exist`);
    if (!library.rubrics.has(s.rubric)) err(s.code, `rubric ${s.rubric} does not exist`);
    for (const t of s.target_techniques) {
      const tech = library.techniques.get(t);
      if (!tech) err(s.code, `target technique ${t} does not exist`);
      else if (!tech.why) err(s.code, `target technique ${t} has no "why" for the debrief`);
      else if (!tech.flawed_line) warn(s.code, `target technique ${t} has no flawed model line`);
    }
    if (s.scoring) {
      const total = s.scoring.items.reduce((sum, i) => sum + i.points, 0);
      if (Math.abs(total - 100) > 1e-9) err(s.code, `scenario scoring points total ${total}, not 100`);
      for (const i of s.scoring.items) if (i.technique && !technique(i.technique)) err(s.code, `scoring item ${i.code} technique ${i.technique} does not exist`);
    }
    if (s.module.startsWith("car") && !s.facts.vehicle) err(s.code, "car scenario needs a vehicle in facts");
    if (s.spanish_reviewed === false) warn(s.code, "Spanish not yet reviewed by a Miami native speaker");
  }

  for (const r of library.rubrics.values()) {
    if (r.extends && !library.rubrics.has(r.extends)) err(r.code, `extends ${r.extends}, which does not exist`);
    for (const i of r.items) if (i.technique && !technique(i.technique)) err(r.code, `item ${i.code} technique ${i.technique} does not exist`);
  }

  const knownItems = new Set<string>([
    ...[...library.rubrics.values()].flatMap((r) => r.items.map((i) => i.code)),
    ...[...library.scenarios.values()].flatMap((s) => s.scoring?.items.map((i) => i.code) ?? []),
  ]);
  for (const c of library.behaviorCards.values()) {
    if (!technique(c.technique)) err(c.code, `technique ${c.technique} does not exist`);
    for (const i of c.rubric_items) if (!knownItems.has(i)) err(c.code, `rubric item ${i} does not exist in any rubric or scenario`);
  }

  for (const m of library.modules.values()) {
    for (const s of m.scenarios) if (!library.scenarios.has(s)) err(m.code, `scenario ${s} does not exist`);
  }

  for (const r of library.rules.values()) {
    if (r.compliant_technique && !technique(r.compliant_technique)) err(r.code, `compliant technique ${r.compliant_technique} does not exist`);
    if (!r.attorney_reviewed) warn(r.code, "not yet reviewed by a Florida dealer attorney (spec 4.5)");
  }
  if (!library.lexicon) err("lexicon", "rules/lexicon.yaml is missing");

  const counts: [string, number, number][] = [
    ["techniques", library.techniques.size, 122],
    ["objections", library.objections.size, 65],
    ["rules", library.rules.size, 26],
    ["rubrics", library.rubrics.size, 5],
  ];
  for (const [name, have, want] of counts) if (have < want) err(name, `${have} loaded, release 1 needs ${want}`);
  return out;
}
