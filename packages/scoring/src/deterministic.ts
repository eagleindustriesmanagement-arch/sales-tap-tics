import type { BilingualText, Lexicon, Library, Rubric, RubricItem, Rule, Scenario } from "@taptics/content";
import { detectLanguage } from "@taptics/i18n";
import { compile, findMoney, type Violation } from "@taptics/rules";
import type { EngineFacts, Evidence, ItemResult, ScoredTurn } from "./types.js";

/** Items from a rubric and everything it extends, child items first (spec 13.2, 13.3). */
export function resolveRubric(library: Library, code: string): { rubric: Rubric; items: RubricItem[] } {
  const rubric = library.rubrics.get(code);
  if (!rubric) throw new Error(`unknown rubric ${code}`);
  const items: RubricItem[] = [];
  const seen = new Set<string>();
  let current: Rubric | undefined = rubric;
  while (current && !seen.has(current.code)) {
    seen.add(current.code);
    for (const item of current.items) if (!items.some((i) => i.code === item.code)) items.push(item);
    current = current.extends ? library.rubrics.get(current.extends) : undefined;
  }
  return { rubric, items };
}

export interface DeterministicInput {
  scenario: Scenario;
  items: RubricItem[];
  scenarioItemCodes: Set<string>;
  transcript: ScoredTurn[];
  violations: Violation[];
  engine: EngineFacts | null;
  rules: Map<string, Rule>;
  lexicon: Lexicon;
  textMode: boolean;
  /** Turns below this recognition confidence cannot fail an item (spec 13.4 item 4). */
  lowConfidence: number;
}

const both = (en: string, es: string): BilingualText => ({ en, es });
const seconds = (ms: number) => (ms / 1000).toFixed(1);

function result(item: RubricItem, input: DeterministicInput, partial: Partial<ItemResult>): ItemResult {
  return {
    code: item.code,
    dimension: item.dimension,
    method: item.method,
    max: item.points,
    points: 0,
    status: "scored",
    evidence: null,
    explanation: item.behavior,
    technique: item.technique,
    scenarioItem: input.scenarioItemCodes.has(item.code),
    ...partial,
  };
}

function evidenceOf(turn: ScoredTurn | undefined): Evidence | null {
  return turn ? { turnIndex: turn.index, quote: turn.text.length > 160 ? `${turn.text.slice(0, 157)}...` : turn.text } : null;
}

const repTurns = (t: ScoredTurn[]) => t.filter((x) => x.speaker === "rep");

/** The first rep turn after each customer objection. */
function objectionReplies(transcript: ScoredTurn[]): ScoredTurn[] {
  const out: ScoredTurn[] = [];
  transcript.forEach((turn, i) => {
    if (turn.speaker === "customer" && turn.isObjection) {
      const reply = transcript.slice(i + 1).find((x) => x.speaker === "rep");
      if (reply) out.push(reply);
    }
  });
  return out;
}

function lowConfidence(turn: ScoredTurn | undefined, input: DeterministicInput): boolean {
  return turn?.asrConfidence !== undefined && turn.asrConfidence < input.lowConfidence;
}

function durationMs(turn: ScoredTurn): number | null {
  return turn.startedMs !== undefined && turn.endedMs !== undefined ? Math.max(0, turn.endedMs - turn.startedMs) : null;
}

function countMatches(turns: ScoredTurn[], patterns: string[]): { count: number; first?: ScoredTurn } {
  let count = 0;
  let first: ScoredTurn | undefined;
  for (const turn of turns) {
    if (patterns.some((p) => compile(p).test(turn.text))) {
      count += 1;
      first ??= turn;
    }
  }
  return { count, first };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

// ---------------------------------------------------------------- per method

function timing(item: RubricItem, input: DeterministicInput): ItemResult {
  const p = item.params;
  const reps = repTurns(input.transcript);
  if (item.code.endsWith("PAUSE")) {
    const replies = objectionReplies(input.transcript);
    if (replies.length === 0) return result(item, input, { status: "not_applicable" });
    if (replies.some((r) => r.pauseBeforeMs === undefined)) return result(item, input, { status: "not_scored", explanation: both("Pause timing was not captured.", "No se captó el tiempo de la pausa.") });
    const min = Number(p["min_pause_ms"] ?? 2000);
    const good = replies.filter((r) => r.pauseBeforeMs! >= min);
    const worst = replies.reduce((a, b) => (a.pauseBeforeMs! <= b.pauseBeforeMs! ? a : b));
    return result(item, input, {
      points: (item.points * good.length) / replies.length,
      evidence: evidenceOf(worst),
      explanation: both(`Paused ${seconds(worst.pauseBeforeMs!)} s before replying to the objection (target ${seconds(min)} s).`, `Hizo una pausa de ${seconds(worst.pauseBeforeMs!)} s antes de responder la objeción (meta: ${seconds(min)} s).`),
    });
  }
  if (item.code.endsWith("PACE")) {
    const replies = objectionReplies(input.transcript);
    if (replies.length === 0) return result(item, input, { status: "not_applicable" });
    const replySet = new Set(replies.map((r) => r.index));
    const baseline = median(reps.filter((r) => !replySet.has(r.index) && r.wordsPerMinute !== undefined).map((r) => r.wordsPerMinute!));
    const after = replies.filter((r) => r.wordsPerMinute !== undefined);
    if (baseline === null || after.length === 0) return result(item, input, { status: "not_scored", explanation: both("Not enough speech to set your baseline pace.", "No hubo suficiente conversación para medir su ritmo normal.") });
    const limit = baseline * (1 + Number(p["max_rate_increase"] ?? 0.08));
    const fastest = after.reduce((a, b) => (a.wordsPerMinute! >= b.wordsPerMinute! ? a : b));
    const ok = after.filter((r) => r.wordsPerMinute! <= limit).length;
    return result(item, input, {
      points: (item.points * ok) / after.length,
      evidence: evidenceOf(fastest),
      explanation: both(`After the objection you spoke at ${Math.round(fastest.wordsPerMinute!)} words a minute; your normal pace is ${Math.round(baseline)}.`, `Después de la objeción habló a ${Math.round(fastest.wordsPerMinute!)} palabras por minuto; su ritmo normal es ${Math.round(baseline)}.`),
    });
  }
  if (item.code === "U-TALK") {
    // Talk share is a timing measure (spec 11.6); typed words are not a stand-in for speaking time.
    const durations = input.transcript.map((t) => ({ t, d: durationMs(t) }));
    if (durations.some((x) => x.d === null)) return result(item, input, { status: "not_scored" });
    const timed = true;
    const size = (_t: ScoredTurn, d: number | null) => d!;
    const total = durations.reduce((s, x) => s + size(x.t, x.d), 0);
    if (total === 0) return result(item, input, { status: "not_applicable" });
    const rep = durations.filter((x) => x.t.speaker === "rep").reduce((s, x) => s + size(x.t, x.d), 0);
    const share = rep / total;
    const max = Number(p["max_share"] ?? 0.65);
    return result(item, input, {
      points: share <= max ? item.points : 0,
      explanation: both(`You talked ${Math.round(share * 100)}% of the ${timed ? "time" : "words"} (target ${Math.round(max * 100)}% or less).`, `Usted habló el ${Math.round(share * 100)}% ${timed ? "del tiempo" : "de las palabras"} (meta: ${Math.round(max * 100)}% o menos).`),
    });
  }
  if (item.code === "U-MONO") {
    if (reps.length === 0) return result(item, input, { status: "not_applicable" });
    if (reps.some((t) => durationMs(t) === null)) return result(item, input, { status: "not_scored" });
    const longest = reps.map((t) => ({ t, ms: durationMs(t)! })).reduce((a, b) => (a.ms >= b.ms ? a : b));
    const max = Number(p["max_seconds"] ?? 60) * 1000;
    return result(item, input, {
      points: longest.ms < max ? item.points : 0,
      evidence: evidenceOf(longest.t),
      explanation: both(`Your longest stretch was about ${Math.round(longest.ms / 1000)} seconds.`, `Su intervención más larga fue de unos ${Math.round(longest.ms / 1000)} segundos.`),
    });
  }
  return result(item, input, { status: "not_scored" });
}

function count(item: RubricItem, input: DeterministicInput): ItemResult {
  const p = item.params;
  const reps = repTurns(input.transcript);
  const max = Number(p["max"] ?? 0);
  if (item.code === "U-LIMIT") {
    const models = (p["models"] as string[]) ?? [];
    const seen = new Set<string>();
    for (const t of reps) for (const m of models) if (compile(`\\b${m}\\b`).test(t.text)) seen.add(m);
    return result(item, input, {
      points: seen.size <= max ? item.points : 0,
      explanation: both(`${seen.size} vehicle${seen.size === 1 ? "" : "s"} in play.`, `${seen.size} vehículo${seen.size === 1 ? "" : "s"} en juego.`),
    });
  }
  // `lexicon` names one or more lexicon lists; `patterns` gives patterns directly.
  const keys = ([] as string[]).concat((p["lexicon"] as string | string[] | undefined) ?? []) as (keyof Lexicon)[];
  const patterns = keys.length
    ? keys.flatMap((k) => {
        const list = input.lexicon[k] as { en: string[]; es: string[] };
        return [...list.en, ...list.es];
      })
    : ((p["patterns"] as string[]) ?? []);
  const { count: n, first } = countMatches(reps, patterns);
  if (item.code === "U-ONECLOSE") {
    const ok = n >= 1 && n <= max;
    return result(item, input, {
      points: ok ? item.points : 0,
      evidence: evidenceOf(first),
      explanation: n === 0 ? both("You never asked for a decision or a next step.", "Nunca pidió una decisión ni un próximo paso.") : both(`You asked for the decision ${n} time${n === 1 ? "" : "s"}.`, `Pidió la decisión ${n} ${n === 1 ? "vez" : "veces"}.`),
    });
  }
  return result(item, input, {
    points: n <= max ? item.points : 0,
    evidence: evidenceOf(first),
    explanation: both(`${n} found (limit ${max}).`, `${n} encontrados (límite ${max}).`),
  });
}

function engineItem(item: RubricItem, input: DeterministicInput): ItemResult | null {
  if (!input.engine) return item.method === "engine" ? result(item, input, { status: "not_scored" }) : null;
  const event = item.params["event"];
  if (event === "hidden_revealed") {
    return result(item, input, {
      points: input.engine.hiddenRevealed ? item.points : 0,
      explanation: input.engine.hiddenRevealed ? both("You surfaced the customer's real concern.", "Sacó a la luz la preocupación real del cliente.") : both("The customer's real concern never came out.", "La preocupación real del cliente nunca salió."),
    });
  }
  if (event === "next_step") {
    const ok = input.engine.nextStepSecured || input.engine.endReason === "sale";
    return result(item, input, {
      points: ok ? item.points : 0,
      explanation: ok ? both("You secured a specific next step the customer agreed to.", "Consiguió un próximo paso específico que el cliente aceptó.") : both("The customer left without a specific, agreed next step.", "El cliente se fue sin un próximo paso específico y acordado."),
    });
  }
  return null;
}

function topicPresent(topic: string, input: DeterministicInput): boolean {
  const reps = repTurns(input.transcript);
  if (topic === "deadline") {
    const rule = input.rules.get("DEAD-01");
    const cues = rule ? [...((rule.parameters["deadline_cues"] as { en: string[]; es: string[] })?.en ?? []), ...((rule.parameters["deadline_cues"] as { en: string[]; es: string[] })?.es ?? [])] : [];
    return reps.some((t) => cues.some((c) => compile(c).test(t.text)));
  }
  if (topic === "price") return reps.some((t) => findMoney(t.text, t.language, input.lexicon).some((m) => m.role === "price" || m.role === "fee"));
  if (topic === "add_on") {
    const cues = [...input.lexicon.money_roles.add_on.before.en, ...input.lexicon.money_roles.add_on.before.es];
    return input.scenario.facts.add_ons.length > 0 || reps.some((t) => cues.some((c) => t.text.toLowerCase().includes(c.toLowerCase())));
  }
  return true;
}

function ruleItem(item: RubricItem, input: DeterministicInput): ItemResult {
  const codes = (item.params["rules"] as string[]) ?? [];
  const topic = item.params["topic"] as string | undefined;
  const hits = input.violations.filter((v) => codes.includes(v.rule));
  if (hits.length === 0 && topic && !topicPresent(topic, input)) return result(item, input, { status: "not_applicable" });
  const confident = hits.filter((v) => !v.uncertain);
  if (hits.length > 0 && confident.length === 0) return result(item, input, { status: "not_scored", explanation: both("Flagged for review: the recording was unclear on that number.", "Marcado para revisión: la grabación no se entendió bien en ese número.") });
  const first = confident[0];
  const turn = first ? input.transcript.find((t) => t.index === first.turnIndex) : undefined;
  return result(item, input, {
    points: confident.length === 0 ? item.points : 0,
    evidence: first ? { turnIndex: first.turnIndex ?? 0, quote: first.span.text || turn?.text || "" } : null,
    explanation: first ? first.explanation : item.behavior,
  });
}

function languageItem(item: RubricItem, input: DeterministicInput): ItemResult {
  // The customer's first line whose language can be told ("Mmm. Bueno." cannot), and the rep's first reply to it.
  const customers = input.transcript.filter((t) => t.speaker === "customer");
  if (customers.length === 0) return result(item, input, { status: "not_applicable" });
  const firstCustomer = customers.find((t) => detectLanguage(t.text) !== "unknown") ?? customers[0]!;
  const firstRep = input.transcript.find((t) => t.speaker === "rep" && t.index > firstCustomer.index);
  if (!firstRep) return result(item, input, { status: "not_applicable" });
  const customerLang = detectLanguage(firstCustomer.text);
  const repLang = detectLanguage(firstRep.text);
  if (customerLang === "unknown" || repLang === "unknown") return result(item, input, { status: "not_scored" });
  let customerMixed = false;
  let mixedTooEarly: ScoredTurn | undefined;
  for (const t of input.transcript) {
    const lang = detectLanguage(t.text);
    if (t.speaker === "customer" && lang === "mixed") customerMixed = true;
    if (t.speaker === "rep" && lang === "mixed" && !customerMixed) {
      mixedTooEarly ??= t;
    }
  }
  const matched = customerLang === "mixed" || repLang === customerLang;
  const ok = matched && !mixedTooEarly;
  return result(item, input, {
    points: ok ? item.points : 0,
    evidence: evidenceOf(!matched ? firstRep : mixedTooEarly),
    explanation: !matched
      ? both("The customer spoke one language and you answered in the other.", "El cliente habló en un idioma y usted respondió en el otro.")
      : mixedTooEarly
        ? both("You mixed languages before the customer did.", "Usted mezcló idiomas antes que el cliente.")
        : both("You followed the customer's language from the first turn.", "Siguió el idioma del cliente desde el primer turno."),
  });
}

/**
 * The deterministic pass (spec 13.4 item 1, under 2 seconds): timing, counts, rule results, engine events and
 * language. Judge items come back as null and are filled by the judge pass.
 */
export function deterministicPass(input: DeterministicInput): Map<string, ItemResult | null> {
  const out = new Map<string, ItemResult | null>();
  for (const item of input.items) {
    if (input.textMode && item.voice_only) {
      out.set(item.code, result(item, input, { status: "excluded_text_mode", explanation: both("Not scored in text mode.", "No se califica en modo texto.") }));
      continue;
    }
    let r: ItemResult | null = null;
    switch (item.method) {
      case "timing":
        r = timing(item, input);
        break;
      case "count":
        r = count(item, input);
        break;
      case "engine":
      case "engine_and_judge":
        r = engineItem(item, input);
        break;
      case "rule":
        r = ruleItem(item, input);
        break;
      case "language":
        r = languageItem(item, input);
        break;
      case "judge":
        r = null;
        break;
    }
    if (r && r.status === "scored" && r.points < r.max && r.evidence && lowConfidence(input.transcript.find((t) => t.index === r!.evidence!.turnIndex), input)) {
      r = { ...r, points: 0, status: "not_scored", explanation: both("Not scored: the recording was unclear at this moment.", "Sin calificar: la grabación no se entendió bien en este momento.") };
    }
    out.set(item.code, r);
  }
  return out;
}
