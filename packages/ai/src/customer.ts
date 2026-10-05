import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { GlossaryTerm, Lexicon, Persona, Scenario, ScenarioFacts } from "@taptics/content";
import { stripCues, type CustomerDirective, type SessionVariation } from "@taptics/engine";
import { t, type Language } from "@taptics/i18n";
import { formatDollars, guardCustomerLine, type CustomerIssue } from "@taptics/rules";
import type { AiClient } from "./client.js";
import { loadPrompt, render } from "./prompts.js";

export interface CustomerConfig {
  scenario: Scenario;
  persona: Persona;
  variation: SessionVariation;
  language: Language;
  glossary: GlossaryTerm[];
  lexicon: Lexicon;
  tenantId: string;
  sessionId: string;
}

export interface CustomerSentence {
  /** What gets spoken: bracket cues removed (spec 11.4 item 3). */
  text: string;
  raw: string;
}

export interface CustomerIncident {
  attempt: number;
  issues: CustomerIssue[];
  /** True when part of the reply had already been spoken and the rest was dropped. */
  truncated: boolean;
}

export interface CustomerTurnResult {
  raw: string;
  spoken: string;
  incidents: CustomerIncident[];
  usedFallback: boolean;
}


const dollars = (cents: number) => formatDollars(cents, "en");

/** The facts the customer knows (spec 10.4 item 3): their vehicle of interest, their trade, what they were told. */
export function customerFacts(facts: ScenarioFacts, language: Language, industry: Scenario["industry"] = "cars"): string {
  const lines: string[] = [];
  const v = facts.vehicle;
  const car = industry === "cars";
  lines.push(language === "es" ? `- ${car ? "El carro que le interesa" : "Lo que le interesa"}: ${v.year} ${v.make} ${v.model} ${v.trim}${v.color ? `, ${v.color}` : ""}.` : `- ${car ? "The vehicle you are looking at" : "What you are looking at"}: ${v.year} ${v.make} ${v.model} ${v.trim}${v.color ? `, ${v.color}` : ""}.`);
  if (facts.trade) {
    const payoff = facts.trade.payoff_cents === null ? "" : facts.trade.payoff_cents === 0 ? (language === "es" ? " (pagado)" : " (paid off)") : ` (${language === "es" ? "debe" : "you owe"} ${dollars(facts.trade.payoff_cents)})`;
    lines.push(language === "es" ? `- ${car ? "Su carro actual para el trade-in" : "Lo que entregaría como parte del pago"}: ${facts.trade.vehicle}${payoff}.` : `- ${car ? "Your current car to trade" : "What you would trade in"}: ${facts.trade.vehicle}${payoff}.`);
  }
  for (const [key, value] of Object.entries(facts.customer_knows)) {
    const label = key.replace(/_cents$/, "").replace(/_/g, " ");
    const shown = typeof value === "number" && key.endsWith("_cents") ? `${dollars(value)}${/payment|budget/.test(key) ? (language === "es" ? " al mes" : " a month") : ""}` : String(value);
    lines.push(`- ${label}: ${shown}`);
  }
  return lines.join("\n");
}

/** Who the customer is, by the scenario's industry (decision 0033): a solar homeowner is never told they are buying a car. */
const ROLE: Record<Scenario["industry"], string> = {
  cars: "a car buyer at a dealership",
  homes: "a home buyer talking with a new-home sales agent",
  solar: "a homeowner hearing a solar offer",
  furniture: "a shopper in a furniture store",
};

/** Everyday sales words a Miami Spanish speaker uses, when the persona lists none. */
const EVERYDAY_TERMS: Record<Scenario["industry"], string> = {
  cars: '"el down", "el trade-in"',
  homes: '"el closing", "el HOA"',
  solar: '"el down", "los paneles"',
  furniture: '"el delivery", "el sofá"',
};

function personaBlock(cfg: CustomerConfig): string {
  const { persona, variation, language } = cfg;
  return [
    `- Name: ${variation.name}. Age: ${persona.age_range}.`,
    `- Situation: ${persona.situation[language]}`,
    `- Temperament: ${persona.temperament_note[language]}${variation.mood ? ` Today you are ${variation.mood}.` : ""}`,
    `- What you care about most in a salesperson: ${persona.buyer_orientation === "task" ? "getting facts and numbers fast" : persona.buyer_orientation === "relationship" ? "feeling respected and not pushed" : "feeling smart about the decision"}.`,
    `- Your objection, which you open with or raise early: "${persona.stated_line[language]}"`,
  ].join("\n");
}

function languageRules(cfg: CustomerConfig): { rules: string; register: string; block: string } {
  const { persona, language } = cfg;
  const mixes = persona.language.mixes_when_rep_mixes;
  const rules =
    language === "es"
      ? `Speak natural Miami Spanish (Caribbean, Venezuelan or Colombian, not Castilian). Everyday sales terms like ${persona.language.everyday_terms.map((t) => `"${t}"`).join(", ") || EVERYDAY_TERMS[cfg.scenario.industry]} are normal in your Spanish.${mixes ? " If the salesperson mixes English and Spanish, you may mix the same way; never mix first." : " Stay in Spanish even if the salesperson switches."}`
      : `Speak natural American English.${persona.language.preferred === "es" ? " Spanish is your more comfortable language: if the salesperson switches to Spanish, you switch too and stay there." : ""}${mixes ? " If the salesperson mixes English and Spanish, you may mix the same way; never mix first." : ""}`;
  const register = language === "es" ? (persona.register === "usted" ? "Use usted with the salesperson until they clearly move to tú and you are comfortable; then you may use tú." : "You use tú.") : "Plain, everyday English.";
  const block =
    language === "es"
      ? `# Miami Spanish terms\nUse these the way Miami customers do:\n${cfg.glossary.map((g) => `- ${g.en}: ${g.es_miami.join(" / ")}${g.avoid.length ? ` (not ${g.avoid.join(", ")})` : ""}`).join("\n")}`
      : "";
  return { rules, register, block };
}

/** The scene note for one reply, from the engine's directive (spec 10.4 item 4). */
export function sceneNote(directive: CustomerDirective, persona: Persona, alreadyRevealed: boolean, blockedReason?: string): string {
  const lines: string[] = [];
  if (directive.endNow) lines.push("This is your last line. Say a short goodbye in character and add [leaving].");
  else if (directive.exit === "walk_away") lines.push(`You have decided to leave. Say so in character and start heading out. You have ${directive.exitTurnsLeft} more line(s). If the salesperson asks for one small, specific, low-pressure thing (like texting you the out-the-door price), you may accept with [agreed_next_step]; otherwise decline politely.`);
  else if (directive.exit === "not_now") lines.push(`You are not buying today ("Not today, thanks.") and you are getting ready to go. You have ${directive.exitTurnsLeft} more line(s). You may accept a specific, low-pressure next step if the salesperson offers one, with [agreed_next_step].`);
  if (!alreadyRevealed) {
    if (directive.revealNow) lines.push("Say your real concern now, in your own words, and add [revealed].");
    else if (directive.mayReveal) lines.push("The salesperson asked well. You may now let your real concern come out, naturally, in this reply or the next. When you say it, add [revealed].");
    else lines.push("Do not reveal your real concern yet.");
  }
  if (directive.reactToAnchor) lines.push("The salesperson just threw out a number with no reason behind it. React with mild offense.");
  if (directive.triggerJustHit) {
    const t = persona.walk_out_triggers.find((x) => x.code === directive.triggerJustHit);
    if (t) lines.push(`The salesperson just did this: ${t.description.en} React the way you would. You are now closer to walking out.`);
  }
  if (!directive.exit && directive.turnsRemaining <= 4) lines.push("The conversation is nearly over; you will need to wrap up soon.");
  if (blockedReason) lines.push(`Your previous draft could not be used (${blockedReason}). Write a different reply that stays within what you know.`);
  return render(loadPrompt("customer-state"), { lines: lines.map((l) => `- ${l}`).join("\n") });
}

/**
 * A word in square brackets that names the product ("[SUV]", "[vehicle]", "[el carro]") is the model leaving a slot
 * unfilled, not a tag for the system (October 5: the chat showed "la [SUV]"). It becomes the product's name from the
 * facts, so the customer says "la Equinox"; stripping it instead would leave "la ." on screen and in the voice.
 */
const ARTICLE = String.raw`(?:the|a|an|your|this|that|el|la|los|las|un|una|su|sus|este|esta|estos|estas|ese|esa|esos|esas)`;
/** Words that name a car: the slot becomes the car's model ("la [SUV]" → "la Equinox"). */
const CAR_WORDS = String.raw`suv|car|cars|vehicle|vehicles|truck|van|crossover|sedan|model|product|item|carro|carros|auto|autos|veh[ií]culo|veh[ií]culos|camioneta|troca|modelo|producto`;
/**
 * Words that name what a home builder, solar company or furniture store sells (October 5 audit): a model name
 * after an article reads badly there ("los Rooftop system"), so the slot keeps its own words without the brackets
 * ("[los paneles]" → "los paneles").
 */
const OTHER_WORDS = String.raw`house|home|homes|townhouse|townhome|condo|lot|property|unit|casa|casas|vivienda|modelo de casa|lote|propiedad|unidad|panels?|system|battery|inverter|paneles|placas|sistema|bater[ií]a|inversor|sofa|couch|sectional|furniture|mattress|bed|table|dining set|sof[aá]|seccional|mueble|muebles|colch[oó]n|cama|mesa|juego de comedor`;
const PRODUCT_SLOT = new RegExp(String.raw`\[\s*(${ARTICLE}\s+)?(${CAR_WORDS}|${OTHER_WORDS})\s*\]`, "giu");
const IS_CAR_WORD = new RegExp(String.raw`^(?:${CAR_WORDS})$`, "iu");

/**
 * Fills a product slot the model left unfilled. A car word becomes the product's name, keeping an article said
 * inside the brackets; any other product word, or a car word when the facts carry no name (an empty model), keeps
 * its own words: never a gap ("la .") where the brackets were.
 */
export function fillProductSlots(text: string, productName: string): string {
  const name = (productName ?? "").trim();
  return text.replace(PRODUCT_SLOT, (_whole, article: string | undefined, word: string) => {
    const lead = article ? article.trim() + " " : "";
    return name && IS_CAR_WORD.test(word) ? `${lead}${name}` : `${lead}${word}`;
  });
}

function splitSentences(buffer: string): { complete: string[]; rest: string } {
  const complete: string[] = [];
  let rest = buffer;
  for (;;) {
    const m = rest.match(/^([\s\S]*?[.!?…]+(?:["')\]]+)?(?:\s*\[[^\]]*\])*)\s+(?=\S)/);
    if (!m) break;
    complete.push(m[1]!.trim());
    rest = rest.slice(m[0].length);
  }
  return { complete, rest };
}

/**
 * The AI customer (spec 10.4). One static system prompt per session (cached), an append-only history, and a scene
 * note per reply as a mid-conversation system message. Every sentence passes the customer-line guard before it is
 * yielded for speech (spec 4.3 item 7).
 */
export class AiCustomer {
  readonly history: BetaMessageParam[] = [];
  readonly system: string;
  readonly promptRef: string;
  private revealed = false;

  constructor(private readonly client: AiClient, private readonly cfg: CustomerConfig) {
    const prompt = loadPrompt("customer", 3);
    const lang = languageRules(cfg);
    this.promptRef = prompt.ref;
    this.system = render(prompt, {
      role: ROLE[cfg.scenario.industry],
      setting: cfg.scenario.setting[cfg.language],
      persona: personaBlock(cfg),
      facts: customerFacts(cfg.variation.facts, cfg.language, cfg.scenario.industry),
      hidden_truth: cfg.persona.hidden_truth[cfg.language],
      difficulty: String(cfg.persona.difficulty),
      language_rules: lang.rules,
      register_rules: lang.register,
      language_block: lang.block,
    });
  }

  /** The approved opening line (content, not generated), recorded as the customer's first turn. */
  opening(): CustomerSentence {
    const text = this.cfg.scenario.opening[this.cfg.language];
    this.history.push({ role: "user", content: this.cfg.language === "es" ? "(Empieza la escena.)" : "(The scene begins.)" });
    this.history.push({ role: "assistant", content: text });
    return { text, raw: text };
  }

  /** Streams the customer's reply to one rep turn, sentence by sentence. */
  /** A recorded reply taken into the history, for a session rebuilt from its stored turns. */
  absorb(repText: string, directive: CustomerDirective, raw: string): void {
    const user: BetaMessageParam = { role: "user", content: repText };
    const note: BetaMessageParam = { role: "system", content: sceneNote(directive, this.cfg.persona, this.revealed), clear_at: "next_user_message" };
    if (/\[\s*revealed\s*\]/i.test(raw)) this.revealed = true;
    this.history.push(user, note, { role: "assistant", content: raw || "..." });
  }

  async *reply(repText: string, directive: CustomerDirective): AsyncGenerator<CustomerSentence, CustomerTurnResult> {
    const incidents: CustomerIncident[] = [];
    const user: BetaMessageParam = { role: "user", content: repText };
    let blocked: string | undefined;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const note: BetaMessageParam = { role: "system", content: sceneNote(directive, this.cfg.persona, this.revealed, blocked), clear_at: "next_user_message" };
      const messages = [...this.history, user, note];
      const spokenParts: string[] = [];
      let raw = "";
      let buffer = "";
      let failed: CustomerIssue[] | null = null;
      const product = this.cfg.variation.facts.vehicle.model;
      const check = (sentence: string) =>
        guardCustomerLine({
          text: sentence,
          language: this.cfg.language,
          facts: this.cfg.variation.facts,
          lexicon: this.cfg.lexicon,
          hiddenTruthMarkers: this.cfg.persona.hidden_truth_markers,
          hiddenUnlocked: directive.mayReveal || this.revealed,
        }).filter((i) => i.kind !== "stage_direction_only");
      const stream = this.client.streamText(
        "customer",
        { system: [{ type: "text", text: this.system, cache_control: { type: "ephemeral" } }], messages },
        { tenantId: this.cfg.tenantId, sessionId: this.cfg.sessionId, promptVersion: this.promptRef },
      );
      outer: for await (const delta of stream) {
        buffer += delta;
        const { complete, rest } = splitSentences(buffer);
        buffer = rest;
        for (const drafted of complete) {
          const sentence = fillProductSlots(drafted, product);
          const issues = check(sentence);
          if (issues.length) {
            failed = issues;
            break outer; // stops the stream; nothing after a blocked sentence is spoken
          }
          raw += (raw ? " " : "") + sentence;
          const text = stripCues(sentence);
          if (text) {
            spokenParts.push(text);
            yield { text, raw: sentence };
          }
        }
      }
      if (!failed && buffer.trim()) {
        const last = fillProductSlots(buffer.trim(), product);
        const issues = check(last);
        if (issues.length) failed = issues;
        else {
          raw += (raw ? " " : "") + last;
          const text = stripCues(last);
          if (text) {
            spokenParts.push(text);
            yield { text, raw: last };
          }
        }
      }
      if (failed) incidents.push({ attempt, issues: failed, truncated: spokenParts.length > 0 });
      if (!failed || spokenParts.length > 0) {
        this.commit(user, note, raw);
        return { raw, spoken: spokenParts.join(" "), incidents, usedFallback: false };
      }
      blocked = [...new Set(failed.map((i) => i.kind.replace(/_/g, " ")))].join(", ");
    }
    // Two drafts in a row failed the guard: say a neutral, approved line instead (packages/i18n).
    const fallback = t("customer.fallback", this.cfg.language);
    yield { text: fallback, raw: fallback };
    this.commit(user, { role: "system", content: sceneNote(directive, this.cfg.persona, this.revealed), clear_at: "next_user_message" }, fallback);
    return { raw: fallback, spoken: fallback, incidents, usedFallback: true };
  }

  /** History is append-only: the rep turn, the scene note that applied, and what the customer actually said. */
  private commit(user: BetaMessageParam, note: BetaMessageParam, raw: string) {
    if (/\[\s*revealed\s*\]/i.test(raw)) this.revealed = true;
    this.history.push(user, note, { role: "assistant", content: raw || "..." });
  }
}
