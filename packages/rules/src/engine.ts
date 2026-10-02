import type { BilingualText, Rule } from "@taptics/content";
import {
  checkAuthority,
  checkDeadline,
  checkIdentity,
  checkInventory,
  checkLanguage,
  checkParity,
  checkPattern,
  checkPayment,
  namesAddOns,
  checkPrice,
  checkRate,
  checkTerm,
  checkTrade,
  checkTurnPresence,
  finalizePresence,
  makeViolation,
  moneyIn,
  updateOrder,
  updatePresence,
} from "./checks.js";
import type { CheckContext, SessionComplianceState, Utterance, Violation } from "./types.js";

/** Rules that apply to this speaker and channel, keyed by code. */
export function activeRules(ctx: CheckContext, speaker: Utterance["speaker"]): Map<string, Rule> {
  return new Map(
    ctx.rules
      .filter((r) => r.enabled && r.applies_to.includes(speaker) && r.channels.includes(ctx.channel))
      .map((r) => [r.code, r]),
  );
}

/**
 * Layer one of the rule engine (spec 4.3): deterministic checks of one utterance against the scenario facts.
 * Runs in well under 20 ms. Pass a session state to also run the order and presence rules across turns.
 */
export function checkUtterance(utterance: Utterance, ctx: CheckContext, state?: SessionComplianceState): Violation[] {
  const rules = activeRules(ctx, utterance.speaker);
  const mentions = moneyIn(utterance, ctx);
  const out: Violation[] = [];
  for (const rule of rules.values()) {
    switch (rule.check_kind) {
      case "price_compare":
        out.push(...checkPrice(rule, utterance, ctx, mentions));
        break;
      case "payment_compare":
        out.push(...checkPayment(rule, utterance, ctx, mentions, state?.previousTurnNamedAddOns ?? false));
        break;
      case "term_compare":
        out.push(...checkTerm(rule, utterance, ctx, mentions));
        break;
      case "rate_compare":
        out.push(...checkRate(rule, utterance, ctx, mentions));
        break;
      case "trade_compare":
        out.push(...checkTrade(rule, utterance, ctx, mentions));
        break;
      case "deadline_compare":
        out.push(...checkDeadline(rule, utterance, ctx));
        break;
      case "inventory_compare":
        out.push(...checkInventory(rule, utterance, ctx));
        break;
      case "authority_compare":
        out.push(...checkAuthority(rule, utterance, ctx));
        break;
      case "identity_compare":
        out.push(...checkIdentity(rule, utterance, ctx));
        break;
      case "pattern":
        out.push(...checkPattern(rule, utterance, ctx));
        break;
      case "language":
        if (utterance.speaker === "rep" || utterance.speaker === "demonstrator") out.push(...checkLanguage(rule, utterance, ctx));
        break;
      case "presence":
        out.push(...checkTurnPresence(rule, utterance, ctx, mentions));
        break;
      default:
        // order, session-level presence, parity and classifier-only rules are handled below or elsewhere.
        break;
    }
  }
  if (state) {
    out.push(...updateOrder(rules, utterance, ctx, mentions, state));
    out.push(...updatePresence(rules, utterance, ctx, mentions, state));
    if (utterance.speaker !== "customer") state.previousTurnNamedAddOns = namesAddOns(utterance, ctx);
  }
  return sortViolations(out);
}

/** Presence rules that can only fail at the end of a session (PAY-02, ADD-04, AVAIL-02). */
export function finalizeSession(ctx: CheckContext, state: SessionComplianceState): Violation[] {
  return sortViolations(finalizePresence(activeRules(ctx, "rep"), ctx, state));
}

const SEVERITY_ORDER = { critical: 0, major: 1, minor: 2 } as const;

export function sortViolations(violations: Violation[]): Violation[] {
  return [...violations].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.turnIndex ?? 0) - (b.turnIndex ?? 0) || a.span.start - b.span.start,
  );
}

/** A critical violation fails the attempt, unless it rests on an uncertain number (then it goes to review). */
export function failsHonesty(violations: Violation[]): boolean {
  return violations.some((v) => v.severity === "critical" && !v.uncertain);
}

/**
 * Checks a bilingual content line (a model line, demonstration line or persona line) the way CI does (spec 4.3
 * item 6): each language through the deterministic layer without scenario facts, plus FAIR-01 number parity.
 * Pass scenario facts in `ctx.facts` to also run the fact comparisons (scenario demonstrations).
 */
export function checkContentLine(
  line: BilingualText,
  ctx: Omit<CheckContext, "offerLanguage">,
  speaker: Utterance["speaker"] = "demonstrator",
): Violation[] {
  const out: Violation[] = [];
  for (const language of ["en", "es"] as const) {
    out.push(...checkUtterance({ text: line[language], language, speaker }, { ...ctx, offerLanguage: language }));
  }
  const fair = ctx.rules.find((r) => r.code === "FAIR-01" && r.enabled);
  if (fair) {
    const diff = checkParity(fair, line);
    if (diff) {
      out.push(
        makeViolation(fair, { ...ctx, offerLanguage: "en" }, {}, { start: 0, end: line.en.length, text: line.en }, {
          en: `English carries [${diff.en}] and Spanish carries [${diff.es}].`,
          es: `El inglés tiene [${diff.en}] y el español tiene [${diff.es}].`,
        }),
      );
    }
  }
  return sortViolations(out);
}
