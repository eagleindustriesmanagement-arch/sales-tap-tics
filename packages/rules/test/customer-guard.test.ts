import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { guardCustomerLine } from "../src/index.js";

const library = platformLibrary();
const lexicon = library.lexicon!;

/** Runs the guard as the live customer would: against a real scenario's facts and its persona's markers. */
function guard(scenario: string, text: string, language: "en" | "es", hiddenUnlocked = false): string[] {
  const s = library.scenarios.get(scenario)!;
  const persona = library.personas.get(s.persona)!;
  return guardCustomerLine({ text, language, facts: s.facts, lexicon, hiddenTruthMarkers: persona.hidden_truth_markers, hiddenUnlocked }).map((i) => i.kind);
}

describe("customer guard: the hidden ceiling leaks through paraphrase", () => {
  const S = "S-payment-buyer-L2";
  it.each([
    ["en", "Honestly I can't do more than five hundred fifty a month."],
    ["en", "Anything above 550 a month just doesn't work for me."],
    ["en", "I won't spend more than that, period."],
    ["es", "No puedo pagar más de 550 al mes."],
    ["es", "La verdad, no puedo gastar más de eso."],
  ] as const)("blocks before the unlock (%s): %s", (language, text) => {
    expect(guard(S, text, language)).toContain("hidden_leak");
  });

  it.each([
    ["en", "Five fifty. I can't go over $550 a month."],
    ["es", "Quinientos cincuenta. No puedo pagar más de $550 al mes."],
  ] as const)("allows it after the unlock (%s): %s", (language, text) => {
    expect(guard(S, text, language, true)).toEqual([]);
  });

  it("does not read a larger amount that ends in 550 as the ceiling", () => {
    expect(guard(S, "I could put $5,500 down if it helps.", "en")).not.toContain("hidden_leak");
    expect(guard(S, "Podría dar $5,500 de inicial si ayuda.", "es")).not.toContain("hidden_leak");
  });

  it("does not read 'max out' as the ceiling", () => {
    expect(guard(S, "I'd max out my patience before I max out my budget, man.", "en")).not.toContain("hidden_leak");
    expect(guard(S, "That's my max.", "en")).toContain("hidden_leak");
    expect(guard(S, "Ese es mi máximo.", "es")).toContain("hidden_leak");
  });

  it("other payment-ceiling personas match their number with or without a dollar sign", () => {
    const s = [...library.scenarios.values()].find((x) => x.persona === "P-furniture-payment")!;
    expect(guard(s.code, "I really can't go past 240 a month.", "en")).toContain("hidden_leak");
    expect(guard(s.code, "No puedo pagar más de 240 al mes.", "es")).toContain("hidden_leak");
  });
});

describe("customer guard: an amount must fit its role", () => {
  const S = "S-payment-buyer-L2"; // no trade; $6,000 is his cash, $62 is the gap between $612 and $550
  it.each([
    ["en", "I still owe $6,000 on my old car."],
    ["es", "Todavía debo $6,000 de mi carro viejo."],
    ["en", "Carvana offered me six grand for my Civic."],
    ["en", "Carvana offered me $6,000 for my Civic."],
    ["es", "Carvana me ofreció seis mil por mi Civic."],
    ["es", "En Carvana me ofrecieron $6,000 por mi Civic."],
    ["en", "The other dealer had it for $62 less a month."],
    ["es", "La otra agencia lo tenía $62 menos al mes."],
  ] as const)("blocks with no trade or as another store's quote (%s): %s", (language, text) => {
    expect(guard(S, text, language, true)).toContain("false_fact");
  });

  it.each([
    ["en", "[sighs] It's still $612 a month. Too high."],
    ["es", "[suspira] Sigue en $612 al mes. Muy alto."],
    ["en", "I could put $6,000 down if I had to."],
    ["es", "Podría dar $6,000 de inicial si hace falta."],
  ] as const)("still allows a known amount in its own role (%s): %s", (language, text) => {
    expect(guard(S, text, language, true)).toEqual([]);
  });

  const T = "S-trade-defender-L2"; // owes $9,200; appraisal $22,800; saw $26,500 online
  it.each([
    ["en", "I owe about $9,200 on it."],
    ["es", "Debo como $9,200 de la troca."],
    ["en", "The website said my truck was worth $26,500."],
    ["es", "En internet decía que mi troca vale $26,500."],
  ] as const)("allows the customer's real trade numbers (%s): %s", (language, text) => {
    expect(guard(T, text, language, true)).not.toContain("false_fact");
  });

  it.each([
    ["en", "I still owe $6,000 on it."],
    ["es", "Todavía debo $6,000 de la troca."],
    ["en", "Carvana offered me $31,000 for my truck."],
    ["es", "En Carvana me ofrecieron $31,000 por mi troca."],
  ] as const)("blocks a trade number that does not match the trade (%s): %s", (language, text) => {
    expect(guard(T, text, language, true)).toContain("false_fact");
  });
});
