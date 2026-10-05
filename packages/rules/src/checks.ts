import type { BilingualText, Rule, ScenarioFacts } from "@taptics/content";
import { detectLanguage } from "@taptics/i18n";
import { resolveDates } from "./dates.js";
import { findMoney, phrases, type MoneyMention } from "./money.js";
import { findClockTimes, findNumbers, formatDollars, parseEnglishWords, parseSpanishWords } from "./numbers.js";
import { clauseAt, clauses, compile, patternsBoth, type Clause } from "./text.js";
import type { CheckContext, SessionComplianceState, Utterance, Violation } from "./types.js";

// ------------------------------------------------------------------ helpers

type Params = Record<string, unknown>;

export function makeViolation(
  rule: Rule,
  ctx: CheckContext,
  utterance: Pick<Utterance, "turnIndex">,
  span: { start: number; end: number; text: string },
  fact: BilingualText,
  uncertain = false,
): Violation {
  const technique = rule.compliant_technique ? ctx.techniques?.get(rule.compliant_technique) : undefined;
  return {
    rule: rule.code,
    severity: rule.severity,
    layer: "deterministic",
    turnIndex: utterance.turnIndex,
    span,
    trueFact: fact,
    explanation: {
      en: rule.explanation.en.replace("{fact}", fact.en).trim(),
      es: rule.explanation.es.replace("{fact}", fact.es).trim(),
    },
    compliantLine: technique ? technique.model_line : null,
    uncertain,
  };
}

function spanOf(text: string, start: number, end: number) {
  return { start, end, text: text.slice(start, end) };
}

function cueRegex(list: { en: string[]; es: string[] }, literal: boolean): RegExp | null {
  const items = literal ? phrases(list) : [...list.en, ...list.es];
  if (items.length === 0) return null;
  return compile(`(?<![\\p{L}\\p{N}_])(?:${items.join("|")})(?![\\p{L}\\p{N}_])`);
}

/** A negation in the matched words, or within four words before them in the same phrase. */
export function isNegated(ctx: CheckContext, text: string, clause: Clause, start: number, end: number, insideCounts = true): boolean {
  const negation = cueRegex(ctx.lexicon.negations, true);
  if (!negation) return false;
  if (insideCounts && negation.test(text.slice(start, end))) return true;
  // A disclaimed claim: "I'm not going to tell you it's the last one", "no se lo voy a pintar como gratis".
  const disclaimer = cueRegex(ctx.lexicon.disclaimers, false);
  if (disclaimer && disclaimer.test(sentenceBefore(text, start))) return true;
  // A claim raised as a question and denied at once: "Three days to cancel? No, that doesn't exist."
  if (isQuestion(clause)) {
    const reply = text.slice(clause.end).replace(/^[\s?]+/, "").split(/\s+/).slice(0, 4).join(" ");
    if (negation.test(reply)) return true;
  }
  const before = text.slice(clause.start, start);
  const phrase = before.split(/[,;:]/).pop() ?? "";
  const words = phrase.trim().split(/\s+/).slice(-4).join(" ");
  return negation.test(words);
}

export function isAttributed(ctx: CheckContext, text: string, clause: Clause, start: number): boolean {
  const attribution = cueRegex(ctx.lexicon.attributions, true);
  return attribution ? attribution.test(text.slice(clause.start, start)) : false;
}

/** The text from the start of the sentence that contains `start` up to it. */
function sentenceBefore(text: string, start: number): string {
  const head = text.slice(0, start);
  const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  return head.slice(cut + 1);
}

function isQuestion(clause: Clause): boolean {
  return /\?\s*$/.test(clause.text) || clause.text.startsWith("¿");
}

/** A real question or conditional ("Can I text you?", "if you're approved"), not a tag on a statement. */
function isAskingOrConditional(ctx: CheckContext, text: string, clause: Clause, start: number): boolean {
  const before = text.slice(clause.start, start);
  if (/(?<![\p{L}])(if|whether|si)(?![\p{L}])/iu.test(before)) return true;
  if (!isQuestion(clause)) return false;
  const tag = /(,\s*)?(right|okay|ok|correct|yes|verdad|cierto|no|sí)\s*\?\s*$/iu;
  return !tag.test(clause.text);
}

interface Hit {
  start: number;
  end: number;
  clause: Clause;
  groups: string[];
}

function withAddOns(pattern: string, ctx: CheckContext): string | null {
  const names = (ctx.facts?.add_ons ?? []).flatMap((a) => [a.name.en, a.name.es, ...(a.aliases?.en ?? []), ...(a.aliases?.es ?? [])]);
  if (names.length === 0) return null;
  const alternation = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))]
    .sort((x, y) => y.length - x.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return pattern.replaceAll("{add_ons}", alternation);
}

/** Matches a rule's bilingual patterns, applying its negation, attribution and echo breaks. */
export function patternHits(rule: Rule, utterance: Utterance, ctx: CheckContext, key = "patterns"): Hit[] {
  const params = rule.parameters as Params;
  const text = utterance.text;
  const hits: Hit[] = [];
  for (const raw of patternsBoth(params[key], utterance.language)) {
    // "{add_ons}" stands for this deal's own add-ons, by name and alias, in both languages (a furniture protection
    // plan, a solar battery); without add-ons the pattern does not apply.
    const pattern = raw.includes("{add_ons}") ? withAddOns(raw, ctx) : raw;
    if (pattern === null) continue;
    const re = compile(pattern, "giu");
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (hits.some((h) => start < h.end && end > h.start)) continue;
      const clause = clauseAt(text, start);
      if (params["negation_breaks"] && isNegated(ctx, text, clause, start, end)) continue;
      if (params["attribution_breaks"] && isAttributed(ctx, text, clause, start)) continue;
      if (params["echo_breaks"] && isQuestion(clause) && utterance.previousCustomerText) {
        const previous = utterance.previousCustomerText;
        if (patternsBoth(params[key], utterance.language).some((p) => { const q = p.includes("{add_ons}") ? withAddOns(p, ctx) : p; return q !== null && compile(q).test(previous); })) continue;
      }
      hits.push({ start, end, clause, groups: [...m].slice(1).map((g) => g ?? "") });
    }
  }
  return hits;
}

function factParam(rule: Rule, name = "fact"): BilingualText {
  const value = (rule.parameters as Params)[name] as BilingualText | undefined;
  return value ?? { en: rule.description.en, es: rule.description.es };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function within(value: number, targets: number[], tolerance: number): boolean {
  return targets.some((t) => Math.abs(value - t) <= tolerance);
}

function feeTotal(facts: ScenarioFacts): number {
  return sum(facts.dealer_fees.map((f) => f.cents));
}

/** Prices any buyer can pay, then prices that need a qualifying rebate. */
export function validPrices(facts: ScenarioFacts): { anyone: number[]; qualifying: number[] } {
  const everyone = facts.rebates.filter((r) => r.eligibility === "everyone");
  const qualifying = facts.rebates.filter((r) => r.eligibility === "qualifying");
  const base = facts.all_in_price_cents;
  const anyone = new Set<number>([base, base - sum(everyone.map((r) => r.cents)), ...everyone.map((r) => base - r.cents)]);
  for (const alt of facts.alternatives) anyone.add(alt.all_in_price_cents);
  const qualifyingPrices = new Set<number>();
  for (const q of qualifying) {
    for (const p of anyone) qualifyingPrices.add(p - q.cents);
  }
  return { anyone: [...anyone], qualifying: [...qualifyingPrices] };
}

function allInFact(facts: ScenarioFacts): BilingualText {
  const fees = feeTotal(facts);
  const all = formatDollars(facts.all_in_price_cents, "en");
  const veh = formatDollars(facts.price_cents, "en");
  const fee = formatDollars(fees, "en");
  return {
    en: `The all-in price is ${all} (vehicle ${veh} plus ${fee} in mandatory dealer charges). Only government charges paid directly by the customer are added.`,
    es: `El precio total es ${all} (vehículo ${veh} más ${fee} en cargos obligatorios del concesionario). Solo se suman los cargos del gobierno que paga directamente el cliente.`,
  };
}

function moneyIn(utterance: Utterance, ctx: CheckContext): MoneyMention[] {
  const v = ctx.facts?.vehicle;
  const vehicleNames = v ? [v.model, v.make, v.trim].filter((x): x is string => typeof x === "string" && x.length > 1) : [];
  return findMoney(utterance.text, utterance.language, ctx.lexicon, { lowConfidence: utterance.lowConfidence, vehicleNames });
}

function claims(mentions: MoneyMention[], role: MoneyMention["role"]): MoneyMention[] {
  return mentions.filter((m) => m.role === role && !m.attributed && !m.delta && m.placeholder === null);
}

function addOnWords(ctx: CheckContext): RegExp | null {
  const facts = ctx.facts;
  const names = facts
    ? facts.add_ons.flatMap((a) => [a.name.en, a.name.es, ...(a.aliases?.en ?? []), ...(a.aliases?.es ?? [])])
    : [];
  const cues = [...ctx.lexicon.money_roles.add_on.before.en, ...ctx.lexicon.money_roles.add_on.before.es, ...names];
  return cueRegex({ en: cues, es: [] }, true);
}

// ------------------------------------------------------------------ price (PRICE-01, PRICE-02)

export function checkPrice(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[]): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const params = rule.parameters as Params;
  const tolerance = Number(params["tolerance_cents"] ?? 100);
  const approxTolerance = Number(params["approximate_tolerance_cents"] ?? 0);
  const minRatio = Number(params["min_price_ratio"] ?? 0.5);
  const { anyone, qualifying } = validPrices(facts);
  const valid = [...anyone, ...qualifying];
  const fees = feeTotal(facts);
  const feeExcluded = [
    ...valid.map((p) => p - fees),
    ...facts.dealer_fees.flatMap((f) => valid.map((p) => p - f.cents)),
  ];
  const out: Violation[] = [];
  for (const m of claims(mentions, "price")) {
    if (m.value < facts.all_in_price_cents * minRatio) continue; // an add-on or fee price, not the vehicle
    // A number the rep denies is a correction, not a quote: "No, it's not 32,450", "no son 32,450".
    if (/(?<![\p{L}])(?:no|not|isn'?t|never|nunca)(?:\s+\p{L}+)?\s*\$?\s*$/iu.test(utterance.text.slice(Math.max(0, m.start - 16), m.start))) continue;
    const tol = m.approximate ? Math.max(tolerance, approxTolerance) : tolerance;
    if (within(m.value, valid, tol)) continue;
    const leavesOutFees = within(m.value, feeExcluded, tolerance);
    const min = facts.authority.min_all_in_price_cents;
    if (!leavesOutFees && min !== null && m.value >= min && m.value <= facts.all_in_price_cents) continue; // a real concession
    out.push(makeViolation(rule, ctx, utterance, spanOf(utterance.text, m.start, m.end), allInFact(facts), m.uncertain));
  }
  return out;
}

// ------------------------------------------------------------------ payments (PAY-01, PAY-03, RATE-01)

function matchOption(facts: ScenarioFacts, cents: number, tolerance: number) {
  return facts.payment_options.find((o) => Math.abs(o.cents - cents) <= tolerance) ?? null;
}

export function namesAddOns(utterance: Utterance, ctx: CheckContext): boolean {
  return addOnWords(ctx)?.test(utterance.text) ?? false;
}

export function checkPayment(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[], previousTurnNamedAddOns = false): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const tolerance = Number((rule.parameters as Params)["tolerance_cents"] ?? 100);
  const addOns = addOnWords(ctx);
  const out: Violation[] = [];
  for (const m of claims(mentions, "payment")) {
    const option = matchOption(facts, m.value, tolerance);
    if (!option || option.includes_add_ons.length === 0) continue;
    const clause = clauseAt(utterance.text, m.start);
    const labeled = previousTurnNamedAddOns || (addOns ? addOns.test(clause.text) || addOns.test(utterance.text) : false);
    if (labeled) continue;
    const names = facts.add_ons.filter((a) => option.includes_add_ons.includes(a.code));
    out.push(
      makeViolation(rule, ctx, utterance, spanOf(utterance.text, m.start, m.end), {
        en: `${formatDollars(option.cents, "en")} a month includes ${names.map((a) => a.name.en).join(", ")}. Without them it is ${formatDollars(facts.payment_options.find((o) => o.includes_add_ons.length === 0)?.cents ?? option.cents, "en")}.`,
        es: `${formatDollars(option.cents, "es")} al mes incluye ${names.map((a) => a.name.es).join(", ")}. Sin eso es ${formatDollars(facts.payment_options.find((o) => o.includes_add_ons.length === 0)?.cents ?? option.cents, "es")}.`,
      }, m.uncertain),
    );
  }
  return out;
}

export function checkTerm(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[]): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const params = rule.parameters as Params;
  const tolerance = Number(params["tolerance_cents"] ?? 100);
  const out: Violation[] = [];
  const plain = facts.payment_options.filter((o) => o.includes_add_ons.length === 0);
  if (plain.length === 0) return out;
  const shortest = Math.min(...plain.map((o) => o.term_months));
  for (const m of claims(mentions, "payment")) {
    const option = matchOption(facts, m.value, tolerance);
    if (!option || option.includes_add_ons.length === 0 || option.term_months <= shortest) continue;
    const disclosed = patternsBoth(params["term_disclosure"], utterance.language).some((p) => compile(p).test(utterance.text));
    if (disclosed) continue;
    out.push(
      makeViolation(rule, ctx, utterance, spanOf(utterance.text, m.start, m.end), {
        en: `That payment uses a ${option.term_months}-month term to fit the add-ons; the payment without them is on ${shortest} months.`,
        es: `Ese pago usa un plazo de ${option.term_months} meses para que quepan los productos adicionales; el pago sin ellos es a ${shortest} meses.`,
      }, m.uncertain),
    );
  }
  return out;
}

export function checkRate(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[]): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const params = rule.parameters as Params;
  const tolerance = Number(params["tolerance_cents"] ?? 100);
  const text = utterance.text;
  const out: Violation[] = [];

  // Payments must come from the facts (the numbers sheet) or the manager's real authority. With neither, no payment
  // has been quoted, so any payment the rep states is made up (a home buyer's mortgage, a cash deal).
  const min = facts.authority.min_payment_cents;
  {
    const max = Math.max(0, ...facts.payment_options.map((o) => o.cents));
    const lowest = Math.min(...facts.payment_options.map((o) => o.cents), min ?? Infinity);
    const payments = claims(mentions, "payment");
    for (const m of payments) {
      if (matchOption(facts, m.value, tolerance)) {
        // A real payment with a term or a down payment from no sheet option is a made-up deal (October 5: "$549 al
        // mes, 60 meses, $3,500 de inicial" when $549 is 72 months with $5,500 down). What follows the payment, up to
        // the next payment or the end of the sentence, must match an option with this payment.
        const wrong = mismatchedTerms(facts, m, payments, mentions, text, tolerance, utterance.language);
        if (wrong) {
          const ways = facts.payment_options.filter((o) => Math.abs(o.cents - m.value) <= tolerance);
          out.push(
            makeViolation(rule, ctx, utterance, spanOf(text, m.start, Math.max(m.end, wrong.end)), {
              en: `${formatDollars(m.value, "en")} a month is ${ways.map((o) => `${o.term_months} months with ${formatDollars(o.down_cents, "en")} down`).join(", or ")}.`,
              es: `${formatDollars(m.value, "es")} al mes es a ${ways.map((o) => `${o.term_months} meses con ${formatDollars(o.down_cents, "es")} de inicial`).join(", o a ")}.`,
            }, m.uncertain),
          );
        }
        continue;
      }
      // A small monthly amount is the cost of a product or a gap between offers ("twenty bucks a month"), not a payment.
      // With no quoted payment to compare, anything under $50 a month is treated as that kind of small cost.
      if (m.value < (Number.isFinite(lowest) ? lowest / 4 : 5000)) continue;
      if (min !== null && m.value >= min - tolerance && m.value <= max + tolerance) continue;
      const options = facts.payment_options.map((o) => formatDollars(o.cents, "en")).join(", ");
      out.push(
        makeViolation(rule, ctx, utterance, spanOf(text, m.start, m.end), {
          en: `The real payment options are ${options || "not set yet"}${min !== null ? `; the manager can go as low as ${formatDollars(min, "en")}` : ""}.`,
          es: `Las opciones reales de pago son ${options || "todavía no definidas"}${min !== null ? `; el gerente puede bajar hasta ${formatDollars(min, "es")}` : ""}.`,
        }, m.uncertain),
      );
    }
  }

  // Rates.
  const rateCue = cueRegex(params["rate_cues"] as { en: string[]; es: string[] }, true);
  for (const n of findNumbers(text, utterance.language).filter((x) => x.unit === "percent")) {
    const clause = clauseAt(text, n.start);
    if (!rateCue || !rateCue.test(clause.text)) continue;
    if (isAskingOrConditional(ctx, text, clause, n.start) || isAttributed(ctx, text, clause, n.start)) continue;
    const approved = facts.lender_state === "approved" && facts.approved_apr_bps !== null;
    if (approved && Math.abs(n.value - facts.approved_apr_bps!) <= Number(params["tolerance_bps"] ?? 0)) continue;
    out.push(
      makeViolation(rule, ctx, utterance, spanOf(text, n.start, n.end), approved
        ? { en: `The approved rate is ${(facts.approved_apr_bps! / 100).toFixed(2)}% APR.`, es: `La tasa aprobada es ${(facts.approved_apr_bps! / 100).toFixed(2)}% APR.` }
        : { en: `There is no approved rate yet; the lender state is "${facts.lender_state}".`, es: `Todavía no hay una tasa aprobada; el estado con el banco es "${facts.lender_state}".` }),
    );
  }

  // A zero rate said in words ("no interest for 12 months", "sin intereses"): true only when a quoted option or the
  // approval really is 0% APR. The words carry their own "no", so only a negation or disclaimer before them counts.
  const zeroIsReal = facts.payment_options.some((o) => o.apr_bps === 0) || (facts.lender_state === "approved" && facts.approved_apr_bps === 0);
  if (!zeroIsReal) {
    for (const pattern of patternsBoth(params["zero_rate_claims"], utterance.language)) {
      for (const m of text.matchAll(compile(pattern, "giu"))) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        const clause = clauseAt(text, start);
        if (isNegated(ctx, text, clause, start, end, false) || isAttributed(ctx, text, clause, start)) continue;
        if (isAskingOrConditional(ctx, text, clause, start)) continue;
        out.push(
          makeViolation(rule, ctx, utterance, spanOf(text, start, end), {
            en: "No 0% offer is on the sheet, so interest is not free. Any rate comes from the lender.",
            es: "No hay ninguna oferta de 0% en la hoja, así que los intereses no son gratis. La tasa la da el banco.",
          }),
        );
      }
    }
  }

  // Approvals.
  if (facts.lender_state !== "approved") {
    for (const hit of patternHits(rule, utterance, ctx, "approval_claims")) {
      if (isAskingOrConditional(ctx, text, hit.clause, hit.start)) continue;
      out.push(
        makeViolation(rule, ctx, utterance, spanOf(text, hit.start, hit.end), {
          en: `The customer is not approved; the lender state is "${facts.lender_state}". Nothing is final until the lender approves.`,
          es: `El cliente no está aprobado; el estado con el banco es "${facts.lender_state}". Nada es final hasta que el banco apruebe.`,
        }),
      );
    }
  }
  return out;
}

// ------------------------------------------------------------------ trade (TRADE-01, TRADE-02)

export function checkTrade(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[]): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const tolerance = Number((rule.parameters as Params)["tolerance_cents"] ?? 100);
  const out: Violation[] = [];
  for (const m of claims(mentions, "trade")) {
    const appraisal = facts.trade?.appraisal_cents ?? null;
    const max = facts.authority.max_trade_cents ?? appraisal;
    if (appraisal !== null && m.value >= appraisal - tolerance && m.value <= (max ?? appraisal) + tolerance) continue;
    out.push(
      makeViolation(rule, ctx, utterance, spanOf(utterance.text, m.start, m.end),
        appraisal === null
          ? { en: "The trade has not been appraised yet, so there is no trade number to quote.", es: "El trade-in todavía no se ha tasado, así que no hay un valor que dar." }
          : {
              en: `The appraisal is ${formatDollars(appraisal, "en")}${facts.trade?.basis ? ` (${facts.trade.basis})` : ""}${max !== appraisal ? `; the manager can go to ${formatDollars(max!, "en")}` : ""}.`,
              es: `La tasación es ${formatDollars(appraisal, "es")}${facts.trade?.basis ? ` (${facts.trade.basis})` : ""}${max !== appraisal ? `; el gerente puede llegar a ${formatDollars(max!, "es")}` : ""}.`,
            },
        m.uncertain),
    );
  }
  return out;
}

export function checkTradeConditions(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[]): Violation[] {
  const facts = ctx.facts;
  if (!facts?.trade || facts.trade.conditions.length === 0) return [];
  const trade = claims(mentions, "trade");
  if (trade.length === 0) return [];
  const markers = patternsBoth((rule.parameters as Params)["condition_markers"], utterance.language);
  if (markers.some((p) => compile(p).test(utterance.text))) return [];
  const first = trade[0]!;
  return [
    makeViolation(rule, ctx, utterance, spanOf(utterance.text, first.start, first.end), {
      en: `The trade number depends on: ${facts.trade.conditions.join("; ")}.`,
      es: `El valor del trade-in depende de: ${facts.trade.conditions.join("; ")}.`,
    }, first.uncertain),
  ];
}

// ------------------------------------------------------------------ deadlines (DEAD-01)

const GENERIC = new Set(["cash", "money", "rebate", "rebates", "incentive", "offer", "the", "a", "de", "del", "el", "la"]);

const CONNECTOR = /\b(?:so|then|but|and then|so that|así que|entonces|pero|y después|y entonces)\b|[,;:]\s*(?:and|y)\b/giu;

/** The stretch of a clause around `at`, cut at connectors that start a new thought ("so", "but", "así que"). */
function deadlineSegment(text: string, clause: Clause, at: number): string {
  const body = text.slice(clause.start, clause.end);
  const local = at - clause.start;
  let start = 0;
  let end = body.length;
  for (const m of body.matchAll(CONNECTOR)) {
    const i = m.index ?? 0;
    if (i <= local) start = i + m[0].length;
    else if (i < end) {
      end = i;
      break;
    }
  }
  return body.slice(start, end);
}

/** The incentives a rep can name, with the words that identify each and its real end date (null: none). */
function deadlineSubjects(facts: ScenarioFacts): { words: string[]; date: string | null }[] {
  const words = (name: string) => fold(name).split(/[^\p{L}\p{N}]+/u).filter((w) => w && !GENERIC.has(w));
  const out = facts.deadlines.map((d) => ({ words: words(d.what), date: d.date as string | null }));
  for (const r of facts.rebates) {
    const w = words(r.name);
    if (!out.some((o) => o.words.join(" ") === w.join(" "))) out.push({ words: w, date: r.ends ?? null });
  }
  return out.filter((o) => o.words.length > 0);
}

export function checkDeadline(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const params = rule.parameters as Params;
  const text = utterance.text;
  const noDeadline = patternsBoth(params["no_deadline"], utterance.language);
  const real = new Set(facts.deadlines.map((d) => d.date));
  const fact: BilingualText = facts.deadlines.length
    ? {
        en: `Real deadlines: ${facts.deadlines.map((d) => `${d.what} ends ${d.date} (${d.proof})`).join("; ")}.`,
        es: `Fechas reales: ${facts.deadlines.map((d) => `${d.what} vence el ${d.date} (${d.proof})`).join("; ")}.`,
      }
    : { en: "There is no real deadline in this deal.", es: "En este negocio no hay ninguna fecha límite real." };
  const out: Violation[] = [];
  const seen = new Set<number>();
  for (const hit of patternHits(rule, utterance, ctx, "increase_cues")) {
    if (seen.has(hit.clause.start)) continue;
    seen.add(hit.clause.start);
    if (noDeadline.some((p) => compile(p).test(hit.clause.text))) continue;
    out.push(makeViolation(rule, ctx, utterance, spanOf(text, hit.clause.start, hit.clause.end), fact));
  }
  for (const hit of patternHits(rule, utterance, ctx, "deadline_cues")) {
    if (seen.has(hit.clause.start)) continue;
    seen.add(hit.clause.start);
    if (noDeadline.some((p) => compile(p).test(hit.clause.text))) continue;
    // Only the part of the clause that carries the deadline: "ends Monday, so come in tomorrow at 10" states one date.
    const segment = deadlineSegment(text, hit.clause, hit.start);
    const resolved = resolveDates(segment, facts.session_date, ctx.lexicon);
    // When the clause names an incentive, its dates must be that incentive's deadline, not another one's
    // ("the first responder cash ends Monday" is false when only the bonus cash ends Monday).
    const named = deadlineSubjects(facts).filter((s) => s.words.every((w) => new RegExp(`\\b${w}\\b`).test(fold(segment))));
    const allowed = named.length ? new Set(named.flatMap((s) => (s.date ? [s.date] : []))) : real;
    const ok = resolved.dates.length === 0 && !resolved.today ? allowed.size > 0 : resolved.dates.every((d) => allowed.has(d));
    if (ok) continue;
    out.push(makeViolation(rule, ctx, utterance, spanOf(text, hit.clause.start, hit.clause.end), fact));
  }
  return out;
}

// ------------------------------------------------------------------ availability (AVAIL-01, AVAIL-02)

function parseCount(word: string): number | null {
  if (/^\d+$/.test(word)) return Number(word);
  return parseEnglishWords([word.toLowerCase()]) ?? parseSpanishWords([word.toLowerCase()]);
}

export function checkInventory(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const text = utterance.text;
  const actual = facts.inventory_same_trim_color;
  const out: Violation[] = [];
  const inventoryFact: BilingualText = {
    en: `There are ${actual} in this trim and color${facts.competing_buyer ? "" : ", and no other buyer is waiting on this one"}.`,
    es: `Hay ${actual} en esta versión y color${facts.competing_buyer ? "" : ", y ningún otro cliente está esperando este carro"}.`,
  };
  for (const hit of patternHits(rule, utterance, ctx, "last_one")) {
    if (actual !== 1) out.push(makeViolation(rule, ctx, utterance, spanOf(text, hit.start, hit.end), inventoryFact));
  }
  for (const hit of patternHits(rule, utterance, ctx, "only_n_left")) {
    const word = hit.groups.find((g) => g && parseCount(g) !== null);
    const claimed = word ? parseCount(word) : null;
    if (claimed !== null && claimed !== actual) out.push(makeViolation(rule, ctx, utterance, spanOf(text, hit.start, hit.end), inventoryFact));
  }
  if (!facts.competing_buyer) {
    for (const hit of patternHits(rule, utterance, ctx, "competing_buyer")) {
      if (isAskingOrConditional(ctx, text, hit.clause, hit.start)) continue;
      out.push(makeViolation(rule, ctx, utterance, spanOf(text, hit.start, hit.end), inventoryFact));
    }
  }
  return out;
}

// ------------------------------------------------------------------ authority (AUTH-01)

export function checkAuthority(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const a = facts.authority;
  const hasRoom = a.manager_has_room || (a.min_all_in_price_cents !== null && a.min_all_in_price_cents < facts.all_in_price_cents) || a.min_payment_cents !== null || (a.max_trade_cents !== null && a.max_trade_cents > (facts.trade?.appraisal_cents ?? 0));
  if (!hasRoom) return [];
  return patternHits(rule, utterance, ctx, "no_room_claims").map((hit) =>
    makeViolation(rule, ctx, utterance, spanOf(utterance.text, hit.start, hit.end), {
      en: "The manager still has room to move in this deal.",
      es: "El gerente todavía tiene margen para moverse en este negocio.",
    }),
  );
}

// ------------------------------------------------------------------ identity (ID-01)

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function checkIdentity(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const facts = ctx.facts;
  if (!facts) return [];
  const profile = [facts.rep_profile.hometown, facts.rep_profile.school].filter((x): x is string => Boolean(x)).map(fold);
  const ignored = ctx.store.ignoredIdentityPlaces.map(fold);
  const out: Violation[] = [];
  for (const hit of patternHits(rule, utterance, ctx, "claims")) {
    // The place is the last real capture group; later groups are terminators such as "." or " too".
    const place = fold(
      [...hit.groups].reverse().find((g) => g && g.trim().length > 2 && !/^([.,!]|too|also|también|in|off|near|by|on|en|por|yo)$/i.test(g.trim())) ?? "",
    );
    if (!place) continue;
    if (ignored.some((i) => place.includes(i) || i.includes(place))) continue;
    if (profile.some((p) => place.includes(p) || p.includes(place))) continue;
    out.push(
      makeViolation(rule, ctx, utterance, spanOf(utterance.text, hit.start, hit.end), {
        en: profile.length ? `Your profile says: ${[facts.rep_profile.hometown, facts.rep_profile.school].filter(Boolean).join(", ")}.` : "Your profile does not list this, so it cannot be claimed.",
        es: profile.length ? `Su perfil dice: ${[facts.rep_profile.hometown, facts.rep_profile.school].filter(Boolean).join(", ")}.` : "Su perfil no dice eso, así que no se puede afirmar.",
      }),
    );
  }
  return out;
}

// ------------------------------------------------------------------ patterns (PRICE-04, ADD-01..03, CANCEL-01, COERCE-01, REVIEW-01)

export function checkPattern(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const params = rule.parameters as Params;
  if (params["check"] === "free_item_must_not_be_charged") return checkFree(rule, utterance, ctx);
  const fact =
    rule.code === "ADD-02"
      ? ((params["fact_by_policy"] as Record<string, BilingualText>)[ctx.store.addOnRemovalPolicy] ?? factParam(rule))
      : factParam(rule);
  return patternHits(rule, utterance, ctx).map((hit) => makeViolation(rule, ctx, utterance, spanOf(utterance.text, hit.start, hit.end), fact));
}

function checkFree(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const params = rule.parameters as Params;
  const text = utterance.text;
  const freeWords = cueRegex(params["free_words"] as { en: string[]; es: string[] }, true);
  if (!freeWords) return [];
  const charged = ctx.facts
    ? [
        ...ctx.facts.add_ons.filter((a) => a.cents > 0).flatMap((a) => [a.name.en, a.name.es, ...(a.aliases?.en ?? []), ...(a.aliases?.es ?? [])]),
        ...ctx.facts.dealer_fees.flatMap((f) => [f.code.replace(/_/g, " "), ...(f.name ? [f.name.en, f.name.es] : []), ...(f.aliases?.en ?? []), ...(f.aliases?.es ?? [])]),
        ...ctx.lexicon.money_roles.fee.before.en,
        ...ctx.lexicon.money_roles.fee.before.es,
      ]
    : [...ctx.lexicon.money_roles.add_on.before.en, ...ctx.lexicon.money_roles.add_on.before.es];
  const chargedRe = cueRegex({ en: charged, es: [] }, true);
  if (!chargedRe) return [];
  const windowTokens = Number(params["window_tokens"] ?? 6);
  const out: Violation[] = [];
  const re = compile(freeWords.source, "giu");
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    const clause = clauseAt(text, start);
    // A free phrase can carry its own negation ("no charge", "no le cuesta nada"): only a negation before it counts.
    if (params["negation_breaks"] && isNegated(ctx, text, clause, start, start + m[0].length, false)) continue;
    if (isAskingOrConditional(ctx, text, clause, start)) continue;
    // The item can be named just before, across a clause break: "And the GAP? Don't worry, that's free."
    const before = text.slice(0, start).trim().split(/\s+/).slice(-windowTokens).join(" ");
    const after = text.slice(start + m[0].length, clause.end).trim().split(/\s+/).slice(0, windowTokens).join(" ");
    if (!chargedRe.test(before) && !chargedRe.test(after)) continue;
    out.push(makeViolation(rule, ctx, utterance, spanOf(text, clause.start, clause.end), {
      en: "That item has a price in this deal, so it is not free.",
      es: "Ese producto tiene precio en este negocio, así que no es gratis.",
    }));
  }
  return out;
}

// ------------------------------------------------------------------ language (LANG-01)

const OFFER_TERMS = /(price|payment|trade|payoff|approv|rate|apr|down|precio|pago|trade-in|aprob|tasa|inicial|cuota)/i;

export function checkLanguage(rule: Rule, utterance: Utterance, ctx: CheckContext): Violation[] {
  const markers = [...((rule.parameters as Params)["condition_markers"] as { en: string[]; es: string[] }).en, ...((rule.parameters as Params)["condition_markers"] as { en: string[]; es: string[] }).es];
  const out: Violation[] = [];
  for (const clause of clauses(utterance.text)) {
    if (!markers.some((p) => compile(p).test(clause.text))) continue;
    const hasMoney = findNumbers(clause.text, utterance.language).some((n) => n.unit === "dollar" || n.unit === "percent");
    if (!hasMoney && !OFFER_TERMS.test(clause.text)) continue;
    const language = detectLanguage(clause.text);
    if ((language === "en" || language === "es") && language !== ctx.offerLanguage) {
      out.push(makeViolation(rule, ctx, utterance, spanOf(utterance.text, clause.start, clause.end), factParam(rule)));
    }
  }
  return out;
}

// ------------------------------------------------------------------ parity (FAIR-01, content)

function signature(text: string, language: "en" | "es"): string {
  return findNumbers(text, language)
    .filter((n) => n.placeholder === null && (n.unit === "dollar" || n.unit === "percent" || n.unit === "cent"))
    .map((n) => `${n.unit}:${n.value}`)
    .concat(findClockTimes(text).map((t) => `time:${t}`))
    .sort()
    .join(",");
}

/** FAIR-01 for content: the English and Spanish versions of a line carry the same money, rates and times. */
export function checkParity(rule: Rule, line: BilingualText): { en: string; es: string } | null {
  const en = signature(line.en, "en");
  const es = signature(line.es, "es");
  return en === es ? null : { en, es };
}

// ------------------------------------------------------------------ order and presence (session-level)

export function updateOrder(
  rules: Map<string, Rule>,
  utterance: Utterance,
  ctx: CheckContext,
  mentions: MoneyMention[],
  state: SessionComplianceState,
): Violation[] {
  const facts = ctx.facts;
  const out: Violation[] = [];
  const prices = claims(mentions, "price").filter((m) => !facts || m.value >= facts.all_in_price_cents * 0.5);
  const firstPrice = prices[0];
  const firstFee = claims(mentions, "fee")[0];

  const p05 = rules.get("PRICE-05");
  if (p05 && !state.totalStated && !state.itemizedBeforeTotal && firstFee && (!firstPrice || firstFee.start < firstPrice.start)) {
    state.itemizedBeforeTotal = true;
    out.push(makeViolation(p05, ctx, utterance, spanOf(utterance.text, firstFee.start, firstFee.end), facts ? allInFact(facts) : factParam(p05)));
  }
  if (firstPrice) state.totalStated = true;

  const p03 = rules.get("PRICE-03");
  if (p03 && facts && firstPrice && !state.firstPriceChecked) {
    state.firstPriceChecked = true;
    const { anyone, qualifying } = validPrices(facts);
    if (within(firstPrice.value, qualifying, 100) && !within(firstPrice.value, anyone, 100)) {
      const q = facts.rebates.filter((r) => r.eligibility === "qualifying");
      out.push(
        makeViolation(p03, ctx, utterance, spanOf(utterance.text, firstPrice.start, firstPrice.end), {
          en: `Start with the price anyone can pay (${formatDollars(Math.max(...anyone.filter((x) => x <= facts.all_in_price_cents)), "en")}); ${q.map((r) => `${r.name} is only for ${r.qualifies ?? "qualifying buyers"}`).join("; ")}.`,
          es: `Empiece con el precio que cualquiera puede pagar (${formatDollars(Math.max(...anyone.filter((x) => x <= facts.all_in_price_cents)), "es")}); ${q.map((r) => `${r.name} es solo para ${r.qualifies ?? "quienes califican"}`).join("; ")}.`,
        }, firstPrice.uncertain),
      );
    }
  }
  return out;
}

export function updatePresence(
  rules: Map<string, Rule>,
  utterance: Utterance,
  ctx: CheckContext,
  mentions: MoneyMention[],
  state: SessionComplianceState,
): Violation[] {
  const facts = ctx.facts;
  const text = utterance.text;
  const turn = utterance.turnIndex ?? 0;
  const out: Violation[] = [];

  // PAY-02 two-payment menu.
  const payments = claims(mentions, "payment");
  const addOns = addOnWords(ctx);
  const mentionsAddOns = addOns ? addOns.test(text) : false;
  if (facts && payments.length > 0) {
    const options = payments.map((m) => matchOption(facts, m.value, 100));
    const withAddOns = options.some((o) => o && o.includes_add_ons.length > 0);
    const without = options.some((o) => o && o.includes_add_ons.length === 0);
    if (withAddOns || mentionsAddOns) {
      state.addOnsPresented = true;
      state.firstAddOnTurn ??= turn;
    }
    if (withAddOns && without) state.twoPaymentMenuShown = true;
  }

  // ADD-04 service contract disclosure.
  const add04 = rules.get("ADD-04");
  if (add04 && facts && ctx.finance) {
    const p = add04.parameters as Params;
    const codes = (p["add_on_codes"] as string[]) ?? [];
    if (facts.add_ons.some((a) => codes.includes(a.code))) {
      const trigger = cueRegex(p["trigger"] as { en: string[]; es: string[] }, true);
      if (trigger?.test(text)) {
        state.serviceContractMentioned = true;
        state.firstServiceContractTurn ??= turn;
      }
      (p["required_all"] as { en: string[]; es: string[] }[]).forEach((req, index) => {
        if (cueRegex(req, true)?.test(text)) state.serviceContractDisclosures.add(index);
      });
    }
  }

  // AVAIL-02 off-lot disclosure.
  const avail02 = rules.get("AVAIL-02");
  if (avail02 && facts && (facts.vehicle.in_transit || !facts.vehicle.in_stock)) {
    if (compile(`\\b${facts.vehicle.model}\\b`).test(text)) {
      state.vehicleMentioned = true;
      state.firstVehicleTurn ??= turn;
    }
    if (patternsBoth((avail02.parameters as Params)["disclosure"], utterance.language).some((p) => compile(p).test(text))) state.offLotDisclosed = true;
  }

  return out;
}

/** Presence rules decided within one turn: CONSENT-01 and TRADE-02. */
export function checkTurnPresence(rule: Rule, utterance: Utterance, ctx: CheckContext, mentions: MoneyMention[]): Violation[] {
  const presence = (rule.parameters as Params)["presence"];
  if (presence === "trade_conditions_stated") return checkTradeConditions(rule, utterance, ctx, mentions);
  if (presence === "text_consent") {
    if (!ctx.facts || ctx.facts.text_consent) return [];
    return patternHits(rule, utterance, ctx, "send_text")
      .filter((hit) => !isAskingOrConditional(ctx, utterance.text, hit.clause, hit.start))
      .map((hit) => makeViolation(rule, ctx, utterance, spanOf(utterance.text, hit.start, hit.end), factParam(rule)));
  }
  return [];
}

export function finalizePresence(rules: Map<string, Rule>, ctx: CheckContext, state: SessionComplianceState): Violation[] {
  const out: Violation[] = [];
  const empty = { start: 0, end: 0, text: "" };
  const pay02 = rules.get("PAY-02");
  if (pay02 && state.addOnsPresented && !state.twoPaymentMenuShown) {
    out.push(makeViolation(pay02, ctx, { turnIndex: state.firstAddOnTurn ?? undefined }, empty, {
      en: "Show the payment with the protection products and without them, side by side, and say they are optional.",
      es: "Muestre el pago con los productos de protección y sin ellos, lado a lado, y diga que son opcionales.",
    }));
  }
  const add04 = rules.get("ADD-04");
  if (add04 && state.serviceContractMentioned) {
    const required = ((add04.parameters as Params)["required_all"] as unknown[]).length;
    if (state.serviceContractDisclosures.size < required) {
      out.push(makeViolation(add04, ctx, { turnIndex: state.firstServiceContractTurn ?? undefined }, empty, factParam(add04)));
    }
  }
  const avail02 = rules.get("AVAIL-02");
  if (avail02 && ctx.facts && state.vehicleMentioned && !state.offLotDisclosed) {
    out.push(makeViolation(avail02, ctx, { turnIndex: state.firstVehicleTurn ?? undefined }, empty, {
      en: ctx.facts.vehicle.in_transit ? "This vehicle is in transit, not on the lot." : "This vehicle is not on the lot.",
      es: ctx.facts.vehicle.in_transit ? "Este vehículo está en camino, no está en el lote." : "Este vehículo no está en el lote.",
    }));
  }
  return out;
}

export { moneyIn };

const MONTHS_AFTER = /^\s*(?:-\s*)?(?:months?|meses|mo\b)/i;

/**
 * The term or the down payment said with a sheet payment, when no option with that payment has it: the end of the
 * first such mention, or null. Only what follows the payment counts, up to the next payment or the sentence's end.
 */
function mismatchedTerms(facts: ScenarioFacts, m: MoneyMention, payments: MoneyMention[], mentions: MoneyMention[], text: string, tolerance: number, language: Utterance["language"]): { end: number } | null {
  const ways = facts.payment_options.filter((o) => Math.abs(o.cents - m.value) <= tolerance);
  const next = payments.find((p) => p.start > m.start)?.start ?? text.length;
  const sentenceEnd = text.slice(m.end).search(/[.;!?](\s|$)/);
  const end = Math.min(next, sentenceEnd < 0 ? text.length : m.end + sentenceEnd);
  for (const n of findNumbers(text.slice(m.end, end), language)) {
    if (n.unit !== "none" || !Number.isInteger(n.value) || n.value < 12 || n.value > 96) continue;
    if (!MONTHS_AFTER.test(text.slice(m.end + n.end, m.end + n.end + 12))) continue;
    if (!ways.some((o) => o.term_months === n.value)) return { end: m.end + n.end };
  }
  for (const d of mentions) {
    if (d.role !== "down" || d.start < m.end || d.start >= end || d.attributed || d.delta || d.placeholder !== null) continue;
    if (!ways.some((o) => Math.abs(o.down_cents - d.value) <= Math.max(tolerance, 5000))) return { end: d.end };
  }
  return null;
}
