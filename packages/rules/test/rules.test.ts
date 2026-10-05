import { describe, expect, it } from "vitest";
import { factsSchema, platformLibrary } from "@taptics/content";
import { checkContentLine, checkUtterance, failsHonesty, finalizeSession, guardCustomerLine, newSessionState } from "../src/index.js";
import type { Utterance } from "../src/index.js";
import { ctx, FACTS } from "./fixtures.js";

type Opts = Parameters<typeof ctx>[0] & { speaker?: Utterance["speaker"]; previousCustomerText?: string };

function hits(text: string, language: "en" | "es" = "en", opts: Opts = {}): string[] {
  const c = ctx({ language, ...opts });
  const u: Utterance = { text, language, speaker: opts.speaker ?? "rep", previousCustomerText: opts.previousCustomerText };
  return [...new Set(checkUtterance(u, c).map((v) => v.rule))].sort();
}

describe("spec 21.2 must-fail examples", () => {
  const cases: [string, "en" | "es", string, Opts?][] = [
    ["That price is only if you finance with us.", "en", "PRICE-04"],
    ["Ese precio es solo si financia con nosotros.", "es", "PRICE-04"],
    ["You need the GAP to get approved.", "en", "ADD-01"],
    ["Necesita el GAP para que lo aprueben.", "es", "ADD-01"],
    ["Ese paquete no se puede quitar.", "es", "ADD-02"],
    ["That package can't be removed.", "en", "ADD-02"],
    ["Tiene tres días para cancelar.", "es", "CANCEL-01"],
    ["You have three days to cancel if you change your mind.", "en", "CANCEL-01"],
    ["You have three days to cancel, right?", "en", "CANCEL-01"],
    ["The price is $32,450.", "en", "PRICE-02", { channel: "phone" }],
    ["I can do $31,000 out the door.", "en", "PRICE-02", { channel: "text" }],
    ["El precio es $32,450.", "es", "PRICE-02", { channel: "phone" }],
  ];
  for (const [text, language, rule, opts] of cases) {
    it(`${rule}: ${text}`, () => expect(hits(text, language, opts)).toContain(rule));
  }
});

describe("critical rules: violations in both languages", () => {
  const cases: [string, "en" | "es", string, Opts?][] = [
    ["This one is $32,450, and that's a great price.", "en", "PRICE-01"],
    ["Se lo dejo en treinta y dos mil cuatrocientos cincuenta dólares.", "es", "PRICE-01"],
    ["The bonus cash ends tomorrow, so let's do it now.", "en", "DEAD-01"],
    ["El bono se vence mañana, así que hay que decidir hoy.", "es", "DEAD-01"],
    ["This price is only good today.", "en", "DEAD-01"],
    ["Este precio es válido solo por hoy.", "es", "DEAD-01"],
    ["Your payment is $625 a month.", "en", "PAY-01"],
    ["Su pago es $625 al mes.", "es", "PAY-01"],
    ["We can get you to $599 a month on 84.", "en", "PAY-03"],
    ["Your payment would be $520 a month.", "en", "RATE-01"],
    ["Su pago quedaría en $520 al mes.", "es", "RATE-01"],
    ["You're approved, so take it home tonight.", "en", "RATE-01"],
    ["Ya está aprobado, se lo puede llevar hoy.", "es", "RATE-01"],
    ["Your rate is 4.9% APR.", "en", "RATE-01"],
    ["Su tasa es 4.9%.", "es", "RATE-01"],
    ["Your trade is worth $16,000 to us.", "en", "TRADE-01"],
    ["Por su trade-in le doy $16,000.", "es", "TRADE-01"],
    ["It's the last one we have in this color.", "en", "AVAIL-01"],
    ["Es el último que nos queda.", "es", "AVAIL-01"],
    ["Someone else is looking at this one right now.", "en", "AVAIL-01"],
    ["Otro cliente lo está viendo ahora mismo.", "es", "AVAIL-01"],
    ["My manager won't go a dollar lower.", "en", "AUTH-01"],
    ["Mi gerente no puede bajar ni un dólar más.", "es", "AUTH-01"],
    ["I'll hold onto your keys until we finish the paperwork.", "en", "COERCE-01"],
    ["Le guardo las llaves hasta que firme.", "es", "COERCE-01"],
    ["The service contract is free with this deal.", "en", "ADD-03"],
    ["Le doy el contrato de servicio gratis.", "es", "ADD-03"],
    ["Everyone gets the warranty, you'll want it.", "en", "ADD-01"],
    ["La garantía es obligatoria para el préstamo.", "es", "ADD-01"],
    ["The bank requires the service contract.", "en", "ADD-01"],
    ["That is a cooling-off period, you can bring it back.", "en", "CANCEL-01"],
  ];
  for (const [text, language, rule, opts] of cases) {
    it(`${rule}: ${text}`, () => expect(hits(text, language, opts)).toContain(rule));
  }
});

describe("compliant hardball passes", () => {
  const cases: [string, "en" | "es", Opts?][] = [
    ["The bonus cash ends Monday; here is the bulletin.", "en"],
    ["El bono vence el lunes. Aquí tiene el boletín.", "es"],
    ["My manager can do $575 a month if you're ready today.", "en"],
    ["Si consigo que mi gerente lo deje en $575 al mes, ¿se lo lleva hoy?", "es"],
    ["Out the door it is $33,349, everything included but tax and tags.", "en"],
    ["Este está en $33,349, todo incluido menos impuestos y placas.", "es"],
    ["Anyone can drive this home for $32,349 out the door. If you are a first responder, there is another $1,000 off.", "en"],
    ["Cualquier persona se lo puede llevar por $32,349 precio total final. Si usted es socorrista, hay $1,000 adicionales de descuento.", "es"],
    ["It is optional, it is not required for your loan, and in Florida you can cancel within 60 days.", "en"],
    ["Es opcional, no hace falta para el préstamo, y en Florida lo puede cancelar dentro de 60 días.", "es"],
    ["In Florida there is no three-day right to cancel a car purchase.", "en"],
    ["En Florida no hay tres días para cancelar la compra de un carro.", "es"],
    ["With the protection products, $625 a month. Without them, $580. They are optional. Which would you like?", "en"],
    ["Con los productos de protección, $625 al mes. Sin ellos, $580. Son opcionales. ¿Cuál prefiere?", "es"],
    ["Your trade comes in at $14,850. Here is the auction data behind it.", "en"],
    ["Su trade-in sale en $14,850. Aquí están los datos de subasta que lo respaldan.", "es"],
    ["Totally your call, and you are free to walk away. Would you take it around the block first?", "en"],
    ["Let me grab your keys for the appraisal; you'll have them back in ten minutes.", "en"],
    ["There's no rush, take your time.", "en"],
    ["Does tomorrow at 5:30 or Saturday at 10 work better for you both?", "en"],
    ["Mañana a las cinco y media, entonces. Le tengo el carro listo.", "es"],
    ["You are from Hialeah? I grew up in Hialeah too.", "en"],
    ["Another dealer told you GAP was required? Here GAP is optional.", "en"],
    ["That package is already on the car, but it is optional. If you do not want to pay for it, here is what we do.", "en"],
    ["Ese paquete ya viene instalado, pero es opcional. Si no lo quiere pagar, esto es lo que hacemos.", "es"],
    ["I do not have much room, but let me show you what I can do and what I would need from you.", "en"],
    ["We have three of these in white, so you can pick.", "en"],
    ["Honestly, it is about sixty bucks higher than what I said.", "en", { speaker: "customer" }],
    ["I have three days to cancel, right?", "en", { speaker: "customer" }],
    ["¿Tres días para cancelar? En Florida eso no aplica para los carros.", "es", { previousCustomerText: "Tengo tres días para cancelar, ¿verdad?" }],
    ["The rebate of $1,000 ends on the 5th, here is the bulletin.", "en"],
    ["Help me understand. When you say the payment is high, what number were you expecting?", "en"],
    ["Of course. It is a big purchase and you should both be comfortable.", "en"],
  ];
  for (const [text, language, opts] of cases) {
    it(text, () => expect(hits(text, language, opts)).toEqual([]));
  }
});

describe("low-confidence numbers", () => {
  it("flags the violation for review instead of failing the attempt", () => {
    const text = "The price is $32,450.";
    const violations = checkUtterance({ text, language: "en", speaker: "rep", lowConfidence: [{ start: 13, end: 20 }] }, ctx({ channel: "phone" }));
    expect(violations.map((v) => v.rule)).toContain("PRICE-02");
    expect(violations.every((v) => v.uncertain)).toBe(true);
    expect(failsHonesty(violations)).toBe(false);
  });

  it("fails honesty for a confident critical violation", () => {
    const violations = checkUtterance({ text: "The price is $32,450.", language: "en", speaker: "rep" }, ctx({ channel: "phone" }));
    expect(failsHonesty(violations)).toBe(true);
  });
});

describe("violation details", () => {
  it("states the true fact and the compliant line in both languages", () => {
    const [v] = checkUtterance({ text: "The price is $32,450.", language: "en", speaker: "rep" }, ctx());
    expect(v!.trueFact.en).toContain("$33,349");
    expect(v!.trueFact.es).toContain("$33,349");
    expect(v!.compliantLine?.en).toMatch(/Out the door/);
    expect(v!.span.text).toBe("$32,450");
  });
});

describe("session order and presence rules", () => {
  it("PRICE-03: first price includes a qualifying-only rebate", () => {
    const state = newSessionState();
    const v = checkUtterance({ text: "It's $31,349 out the door.", language: "en", speaker: "rep", turnIndex: 1 }, ctx(), state);
    expect(v.map((x) => x.rule)).toContain("PRICE-03");
  });

  it("PRICE-05: a fee itemized before the total", () => {
    const state = newSessionState();
    const v = checkUtterance({ text: "The dealer fee is $899, and the total is $33,349.", language: "en", speaker: "rep" }, ctx(), state);
    expect(v.map((x) => x.rule)).toContain("PRICE-05");
    const ok = newSessionState();
    const v2 = checkUtterance({ text: "The total is $33,349, which already includes our $899 dealer fee.", language: "en", speaker: "rep" }, ctx(), ok);
    expect(v2.map((x) => x.rule)).not.toContain("PRICE-05");
  });

  it("PAY-02: add-ons presented without the two-payment menu", () => {
    const c = ctx();
    const state = newSessionState();
    checkUtterance({ text: "With the protection package it's $625 a month.", language: "en", speaker: "rep", turnIndex: 3 }, c, state);
    expect(finalizeSession(c, state).map((v) => v.rule)).toEqual(["PAY-02"]);
    const good = newSessionState();
    checkUtterance({ text: "With the protection products, $625 a month. Without them, $580.", language: "en", speaker: "rep" }, c, good);
    expect(finalizeSession(c, good)).toEqual([]);
  });

  it("ADD-04: service contract without optional and 60-day disclosure, in finance only", () => {
    const floor = ctx();
    const onFloor = newSessionState();
    checkUtterance({ text: "Ana will show you the service contract in finance.", language: "en", speaker: "rep" }, floor, onFloor);
    expect(finalizeSession(floor, onFloor).map((v) => v.rule)).not.toContain("ADD-04");
    const c = { ...ctx(), finance: true };
    const state = newSessionState();
    checkUtterance({ text: "Ana will show you the service contract in finance.", language: "en", speaker: "rep" }, c, state);
    expect(finalizeSession(c, state).map((v) => v.rule)).toContain("ADD-04");
    const good = newSessionState();
    checkUtterance({ text: "The service contract is optional, and in Florida you can cancel it within 60 days.", language: "en", speaker: "rep" }, c, good);
    expect(finalizeSession(c, good).map((v) => v.rule)).not.toContain("ADD-04");
  });

  it("AVAIL-02: an in-transit vehicle discussed without disclosure", () => {
    const facts = factsSchema.parse({ ...FACTS, vehicle: { ...FACTS.vehicle, in_stock: false, in_transit: true } });
    const c = ctx({ facts });
    const state = newSessionState();
    checkUtterance({ text: "The Equinox is a great fit for you.", language: "en", speaker: "rep" }, c, state);
    expect(finalizeSession(c, state).map((v) => v.rule)).toContain("AVAIL-02");
    const good = newSessionState();
    checkUtterance({ text: "This Equinox is in transit and arrives Tuesday.", language: "en", speaker: "rep" }, c, good);
    expect(finalizeSession(c, good).map((v) => v.rule)).not.toContain("AVAIL-02");
  });

  it("CONSENT-01: texting on a phone lead without documented consent, but asking is fine", () => {
    expect(hits("I'll text you the out-the-door price.", "en", { channel: "phone" })).toContain("CONSENT-01");
    expect(hits("Can I text you the out-the-door number so you have it in writing?", "en", { channel: "phone" })).not.toContain("CONSENT-01");
  });

  it("TRADE-02: a conditional trade number stated without its condition", () => {
    const facts = factsSchema.parse({ ...FACTS, trade: { ...FACTS.trade!, conditions: ["payoff letter matches $14,200"] } });
    expect(hits("Your trade comes in at $14,850.", "en", { facts })).toContain("TRADE-02");
    expect(hits("Your trade comes in at $14,850 if the payoff letter matches.", "en", { facts })).not.toContain("TRADE-02");
  });

  it("LANG-01: a condition in English during a Spanish offer", () => {
    expect(hits("Le hago la oferta. This number holds if the payoff letter matches $14,850.", "es", { offerLanguage: "es" })).toContain("LANG-01");
    expect(hits("Este valor se mantiene si la carta del payoff confirma los $14,850.", "es", { offerLanguage: "es" })).not.toContain("LANG-01");
  });

  it("ID-01: invented common ground", () => {
    expect(hits("I'm from Doral too, small world.", "en")).toContain("ID-01");
  });

  it("REVIEW-01: reviews only from happy customers, or rewarded", () => {
    expect(hits("If you're happy, leave us a five-star review.", "en")).toContain("REVIEW-01");
    expect(hits("Now that you have had the Silverado a week or so, would you share how we did?", "en")).toEqual([]);
  });
});

describe("content lines", () => {
  it("runs the pattern rules without facts and checks number parity", () => {
    const library = platformLibrary();
    const base = { facts: null, store: ctx().store, channel: "floor" as const, lexicon: library.lexicon!, rules: [...library.rules.values()], techniques: library.techniques };
    expect(checkContentLine({ en: "Out the door with doc fee, tag and tax, it is $38,912.", es: "El precio total con el cargo de documentación, placa e impuestos es $38,912." }, base)).toEqual([]);
    expect(checkContentLine({ en: "It is $38,912 out the door.", es: "Son $38,921 con todo." }, base).map((v) => v.rule)).toEqual(["FAIR-01"]);
    expect(checkContentLine({ en: "You need the GAP to get approved.", es: "Necesita el GAP para que lo aprueben." }, base).map((v) => v.rule)).toEqual(["ADD-01", "ADD-01"]);
  });
});

describe("customer line guard", () => {
  const lexicon = platformLibrary().lexicon!;
  const markers = { en: ["sixty (bucks|dollars) (higher|more)", "more than (I|what I) told her"], es: ["sesenta dólares (más|por encima)"] };
  it("blocks the hidden truth before an unlock and allows it after", () => {
    const text = "Honestly, it is about sixty bucks higher than what I said.";
    expect(guardCustomerLine({ text, language: "en", facts: FACTS, lexicon, hiddenTruthMarkers: markers, hiddenUnlocked: false }).map((i) => i.kind)).toContain("hidden_leak");
    expect(guardCustomerLine({ text, language: "en", facts: FACTS, lexicon, hiddenTruthMarkers: markers, hiddenUnlocked: true })).toEqual([]);
  });
  it("blocks coaching and invented amounts", () => {
    const g = (text: string) => guardCustomerLine({ text, language: "en", facts: FACTS, lexicon, hiddenTruthMarkers: markers, hiddenUnlocked: true }).map((i) => i.kind);
    expect(g("You should ask me what my wife will think.")).toContain("coaching");
    expect(g("The other place offered me $29,000 out the door.")).toContain("false_fact");
    expect(g("The payment you showed me was $580 a month.")).toEqual([]);
  });
});

describe("clock times for parity", () => {
  it("normalizes spoken and written times in both languages", async () => {
    const { findClockTimes } = await import("../src/numbers.js");
    expect(findClockTimes("Tomorrow at 5:30, then.")).toEqual(["5:30"]);
    expect(findClockTimes("Mañana a las cinco y media, entonces.")).toEqual(["5:30"]);
    expect(findClockTimes("She is off at five tomorrow.")).toEqual(["5:00"]);
    expect(findClockTimes("Ella sale a las cinco mañana.")).toEqual(["5:00"]);
    expect(findClockTimes("Este cumple con las dos.")).toEqual([]);
  });
});

describe("a sheet payment with a term or down payment from no option is made up (October 5: '$549 al mes, 60 meses, $3,500 de inicial')", () => {
  const lib = platformLibrary();
  const sc = lib.scenarios.get("S-payment-buyer-L2")!; // $549 is 72 months with $5,500 down; $541 is 84 with $2,000
  const base = { facts: sc.facts, store: { addOnRemovalPolicy: "none_configured" as const, ignoredIdentityPlaces: [] }, channel: sc.channel, lexicon: lib.lexicon!, rules: [...lib.rules.values()], techniques: lib.techniques };
  const rate = (text: string, language: "en" | "es") => checkUtterance({ text, language, speaker: "rep", turnIndex: 1 }, { ...base, offerLanguage: language }).filter((v) => v.rule === "RATE-01").length;
  it("flags an invented term or down payment, in both languages, for the rep and for debrief text", () => {
    expect(rate("Podemos dejarlo en $549 al mes, 60 meses, $3,500 de inicial.", "es")).toBe(1);
    expect(rate("We can do $549 a month on 60 months.", "en")).toBe(1);
    expect(rate("$541 a month with $5,000 down, on 84 months.", "en")).toBe(1);
    const tip = checkContentLine({ en: "Try: $549 a month, 60 months, $3,500 down.", es: "Pruebe: $549 al mes, 60 meses, $3,500 de inicial." }, base, "debrief");
    expect(tip.some((v) => v.rule === "RATE-01" && v.severity === "critical")).toBe(true);
  });
  it("accepts the real options, alone or side by side", () => {
    expect(rate("$549 a month on 72 months with $5,500 down, or $541 a month with the same $2,000 down, on 84 months.", "en")).toBe(0);
    expect(rate("$549 al mes a 72 meses con $5,500 de inicial, o $541 al mes con los mismos $2,000 de inicial, a 84 meses.", "es")).toBe(0);
    expect(rate("Your payment would be $549 a month.", "en")).toBe(0);
  });
});

/** Probe lines from the October 5 compliance review, checked against the scenarios they were said in. */
const probeLib = platformLibrary();
function scenarioRules(code: string, text: string, language: "en" | "es"): string[] {
  const sc = probeLib.scenarios.get(code)!;
  const c = { ...ctx({ language }), facts: sc.facts, channel: sc.channel };
  return [...new Set(checkUtterance({ text, language, speaker: "rep", turnIndex: 1 }, c).map((v) => v.rule))].sort();
}

describe("CANCEL-01: honest myth-busting is not a claim (a denial after the claim, or 'no existe' before it)", () => {
  const S = "S-three-day-cancel-L1";
  it("a denied three-day right is clean", () => {
    expect(scenarioRules(S, "That three-day cancel thing is a myth for cars.", "en")).toEqual([]);
    expect(scenarioRules(S, "Three days to cancel doesn't apply to cars in Florida.", "en")).toEqual([]);
    expect(scenarioRules(S, "No existe un periodo de tres días para cancelar la compra de un carro, así que asegúrese de que es el carro correcto.", "es")).toEqual([]);
    expect(scenarioRules(S, "Eso de los tres días para cancelar no existe para carros.", "es")).toEqual([]);
    expect(scenarioRules(S, "Lo de los tres días para devolverlo es un mito.", "es")).toEqual([]);
  });
  it("the claim itself, or a claim that it is not a myth, is still critical", () => {
    expect(scenarioRules(S, "Yes, you have three days to cancel.", "en")).toContain("CANCEL-01");
    expect(scenarioRules(S, "You have three days to cancel, that's not a myth.", "en")).toContain("CANCEL-01");
    expect(scenarioRules(S, "Sí, tiene tres días para devolverlo.", "es")).toContain("CANCEL-01");
    expect(scenarioRules(S, "Tiene tres días para cancelar, no es un mito.", "es")).toContain("CANCEL-01");
  });
});

describe("AUTH-01: a manager's approval stated as done must match the authority in the facts", () => {
  const S = "S-payment-buyer-L2"; // manager_has_room false, lender not_applied
  it("flags a made-up approval when the manager has no room, sheet number or not", () => {
    expect(scenarioRules(S, "My manager already approved $550 a month for you.", "en")).toContain("AUTH-01");
    expect(scenarioRules(S, "My manager already approved $541 a month for you.", "en")).toContain("AUTH-01");
    expect(scenarioRules(S, "Mi gerente ya le aprobó $550 al mes.", "es")).toContain("AUTH-01");
    expect(scenarioRules(S, "Mi gerente ya le aprobó $541 al mes.", "es")).toContain("AUTH-01");
  });
  it("asking the manager, a hedge or a denied approval is clean", () => {
    expect(scenarioRules(S, "Let me ask my manager what he can do. I can't promise anything.", "en")).toEqual([]);
    expect(scenarioRules(S, "My manager hasn't approved anything yet.", "en")).toEqual([]);
    expect(scenarioRules(S, "Mi gerente a lo mejor puede mejorar algo, pero no le prometo nada.", "es")).toEqual([]);
    expect(scenarioRules(S, "Mi gerente todavía no aprobó nada.", "es")).toEqual([]);
  });
  it("with room, an approval inside the authority is fine and one outside it is not", () => {
    // Fixture: the manager can go to $575 a month.
    expect(hits("My manager approved $575 a month for you.")).not.toContain("AUTH-01");
    expect(hits("My manager approved $550 a month for you.")).toContain("AUTH-01");
    expect(hits("Mi gerente le aprobó $575 al mes.", "es")).not.toContain("AUTH-01");
    expect(hits("Mi gerente le aprobó $550 al mes.", "es")).toContain("AUTH-01");
  });
});

describe("TRADE-01: a trade number said with the customer's vehicle ('for your truck', 'por su troca', 'for your Silverado')", () => {
  const S = "S-trade-defender-L2"; // appraisal $22,800, no authority above it
  it("flags a trade number above the appraisal", () => {
    expect(scenarioRules(S, "We can give you $25,000 for your truck.", "en")).toContain("TRADE-01");
    expect(scenarioRules(S, "We'll give you $25,000 for your Silverado.", "en")).toContain("TRADE-01");
    expect(scenarioRules(S, "Le damos $25,000 por su troca.", "es")).toContain("TRADE-01");
    expect(scenarioRules(S, "Le doy $25,000 por su camioneta.", "es")).toContain("TRADE-01");
    expect(scenarioRules(S, "Le doy $25,000 por su Silverado.", "es")).toContain("TRADE-01");
  });
  it("the real appraisal is clean", () => {
    expect(scenarioRules(S, "Our appraisal is $22,800, based on the three closest auction sales.", "en")).toEqual([]);
    expect(scenarioRules(S, "We can give you $22,800 for your truck.", "en")).toEqual([]);
    expect(scenarioRules(S, "Nuestra tasación es $22,800, por las tres ventas de subasta más parecidas.", "es")).toEqual([]);
    expect(scenarioRules(S, "Le damos $22,800 por su troca.", "es")).toEqual([]);
  });
});

describe("TRADE-01: the payoff the rep states must match the facts payoff", () => {
  const S = "S-trade-defender-L2"; // payoff $9,200
  it("flags a wrong payoff", () => {
    expect(scenarioRules(S, "Your payoff is $8,000, so you've got $14,800 in equity.", "en")).toContain("TRADE-01");
    expect(scenarioRules(S, "You only owe $8,000 on it.", "en")).toContain("TRADE-01");
    expect(scenarioRules(S, "Usted solo debe $8,000.", "es")).toContain("TRADE-01");
    expect(scenarioRules(S, "Su payoff es $8,000.", "es")).toContain("TRADE-01");
  });
  it("the real payoff, or a question about it, is clean", () => {
    expect(scenarioRules(S, "Your payoff is $9,200, so you've got $13,600 in equity.", "en")).toEqual([]);
    expect(scenarioRules(S, "Do you still owe $8,000 on it?", "en")).toEqual([]);
    expect(scenarioRules(S, "Usted debe $9,200 todavía.", "es")).toEqual([]);
    expect(scenarioRules(S, "¿Todavía debe $8,000?", "es")).toEqual([]);
  });
});

describe("RATE-01: 0% financing said with no 0% offer on the sheet", () => {
  const S = "S-payment-buyer-L2"; // no rate on the sheet, lender not applied
  it("flags 0% financing", () => {
    expect(scenarioRules(S, "With 0% financing this month, it's a steal.", "en")).toContain("RATE-01");
    expect(scenarioRules(S, "We've got financing at zero percent for you.", "en")).toContain("RATE-01");
    expect(scenarioRules(S, "Con financiamiento al 0% este mes, es un regalo.", "es")).toContain("RATE-01");
    expect(scenarioRules(S, "Le tengo 0% de financiamiento.", "es")).toContain("RATE-01");
  });
  it("a denial, or a real 0% option, is clean", () => {
    expect(scenarioRules(S, "There's no 0% financing on this one; the rate comes from the lender.", "en")).toEqual([]);
    expect(scenarioRules(S, "No tenemos financiamiento al 0% en este carro.", "es")).toEqual([]);
    const zero = { ...FACTS, payment_options: FACTS.payment_options.map((o) => ({ ...o, apr_bps: 0 })) };
    expect(hits("With 0% financing this month, it's a steal.", "en", { facts: zero })).not.toContain("RATE-01");
    expect(hits("Con financiamiento al 0% este mes, es un regalo.", "es", { facts: zero })).not.toContain("RATE-01");
  });
});

describe("PRICE-01/PRICE-02: denying a dealer fee the deal has", () => {
  const S = "S-payment-buyer-L2"; // $899 dealer fee
  it("flags the denial on the floor and on the phone", () => {
    expect(scenarioRules(S, "There's no dealer fee on this one.", "en")).toContain("PRICE-01");
    expect(scenarioRules(S, "Este no lleva cargo del dealer.", "es")).toContain("PRICE-01");
    expect(hits("We don't charge a doc fee here.", "en", { channel: "phone" })).toContain("PRICE-02");
    expect(hits("Aquí no le cobramos cargo de documentación.", "es", { channel: "phone" })).toContain("PRICE-02");
  });
  it("disclosing the fee, a question, or a deal with no fee is clean", () => {
    expect(scenarioRules(S, "The price includes the $899 dealer fee; only tax and tags are added.", "en")).toEqual([]);
    expect(scenarioRules(S, "I'm not going to tell you there's no dealer fee: it's $899, and it's in the price.", "en")).toEqual([]);
    expect(scenarioRules(S, "El precio ya incluye el cargo del dealer de $899.", "es")).toEqual([]);
    const noFee = { ...FACTS, dealer_fees: [], all_in_price_cents: FACTS.price_cents };
    expect(hits("There's no dealer fee on this one.", "en", { facts: noFee })).toEqual([]);
    expect(hits("Este no lleva cargo del dealer.", "es", { facts: noFee })).toEqual([]);
  });
});
