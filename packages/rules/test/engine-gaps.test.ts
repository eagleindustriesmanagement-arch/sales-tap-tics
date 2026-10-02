import { describe, expect, it } from "vitest";
import { checkUtterance, finalizeSession, newSessionState } from "../src/index.js";
import { findNumbers } from "../src/numbers.js";
import type { Utterance } from "../src/index.js";
import { ctx } from "./fixtures.js";

function hits(text: string, language: "en" | "es" = "en"): string[] {
  const u: Utterance = { text, language, speaker: "rep" };
  return [...new Set(checkUtterance(u, ctx({ language })).map((v) => v.rule))].sort();
}
const values = (text: string, language: "en" | "es") => findNumbers(text, language).map((n) => [n.value, n.unit]);

describe("spoken sales figures (spec 11.1 item 4)", () => {
  it("reads English thousands shorthand", () => {
    expect(values("we can put you in it at thirty-two four fifty", "en")).toEqual([[32450, "none"]]);
    expect(values("he went sixteen-one on the trade", "en")).toEqual([[1610000, "dollar"]]);
    expect(values("that one was nineteen ninety-five", "en")).toEqual([[1995, "none"]]);
    // Ordinary numbers are unchanged.
    expect(values("five seventy-five a month", "en")).toEqual([[57500, "dollar"]]);
    expect(values("thirty two thousand four hundred fifty", "en")).toEqual([[32450, "none"]]);
  });
  it("reads Spanish thousands without mil, and digits split around mil", () => {
    expect(values("se la dejo en treinta y dos cuatrocientos cincuenta", "es")).toEqual([[32450, "none"]]);
    expect(values("son 33 mil 349 con todo", "es")).toEqual([[33349, "none"]]);
    expect(values("treinta y tres mil trescientos cuarenta y nueve", "es")).toEqual([[33349, "none"]]);
  });
  it("reads spoken decimals as rates", () => {
    expect(values("you'd be around six point four", "en")).toEqual([[640, "percent"]]);
    expect(values("le sale al siete punto dos por ciento", "es")).toEqual([[720, "percent"]]);
  });
  it("a spoken rate with no approval breaks RATE-01", () => {
    expect(hits("Your rate with the bank is three point nine.")).toContain("RATE-01");
    expect(hits("Su tasa con el banco es de tres punto nueve.", "es")).toContain("RATE-01");
  });
});

describe("DEAD-01 checks the deadline of the incentive named", () => {
  it("a real date on the wrong incentive is a violation", () => {
    expect(hits("The first responder cash goes away Monday.")).toContain("DEAD-01");
    expect(hits("The bonus cash goes away Monday.")).not.toContain("DEAD-01");
  });
  it("every date in the clause must be real", () => {
    expect(hits("The bonus cash expires on Monday the 19th.")).toContain("DEAD-01");
  });
  it("wider phrasing in both languages", () => {
    expect(hits("Rates are going up after the holiday, so lock it now.")).toContain("DEAD-01");
    expect(hits("Esta oferta es solamente para hoy.", "es")).toContain("DEAD-01");
    expect(hits("Take your time, there is no rush on this.")).not.toContain("DEAD-01");
  });
});

describe("ADD-03 free claims carrying their own negation", () => {
  it("'no charge' and 'no le cuesta nada' on a charged item are violations", () => {
    expect(hits("The GAP is no charge for you today.")).toContain("ADD-03");
    expect(hits("La GAP no le cuesta nada, se la incluimos.", "es")).toContain("ADD-03");
  });
  it("the item can be named in the clause before", () => {
    expect(hits("What about the service contract? Relax, it's on the house.")).toContain("ADD-03");
  });
  it("saying it is not free stays compliant", () => {
    expect(hits("The GAP is not free, it costs $795 and it is optional.")).not.toContain("ADD-03");
  });
});

describe("ADD-04 applies in finance conversations only (spec 4.3)", () => {
  it("is silent on the floor and enforced in finance", () => {
    const line = { text: "Our service contract covers the engine for seven years.", language: "en" as const, speaker: "rep" as const };
    const floor = ctx();
    const s1 = newSessionState();
    checkUtterance(line, floor, s1);
    expect(finalizeSession(floor, s1).map((v) => v.rule)).not.toContain("ADD-04");
    const finance = { ...ctx(), finance: true };
    const s2 = newSessionState();
    checkUtterance(line, finance, s2);
    expect(finalizeSession(finance, s2).map((v) => v.rule)).toContain("ADD-04");
  });
});

describe("small monthly amounts are not payments", () => {
  it("an add-on's monthly cost is not compared with the payment options", () => {
    expect(hits("The GAP adds about fifteen dollars a month.")).not.toContain("RATE-01");
  });
});

describe("claims the rep refuses or rebuts are not made", () => {
  it("a disclaimed claim", () => {
    expect(hits("I'm not going to tell you this is the last one, because it isn't.")).not.toContain("AVAIL-01");
    expect(hits("No le voy a decir que es la última, porque no lo es.", "es")).not.toContain("AVAIL-01");
  });
  it("a question denied at once", () => {
    expect(hits("A cooling-off period? No, Florida doesn't have one for cars.")).not.toContain("CANCEL-01");
    // The claim made as a statement still breaks the rule.
    expect(hits("There's a cooling-off period, so you're covered.")).toContain("CANCEL-01");
  });
});

describe("PAY-01 accepts a label from the rep's previous turn", () => {
  it("add-ons named in the turn before the payment", () => {
    const c = ctx();
    const state = newSessionState();
    checkUtterance({ text: "This next number has the GAP and the service contract in it.", language: "en", speaker: "rep", turnIndex: 0 }, c, state);
    const v = checkUtterance({ text: "That's $625 a month.", language: "en", speaker: "rep", turnIndex: 1 }, c, state);
    expect(v.map((x) => x.rule)).not.toContain("PAY-01");
    expect(hits("That's $625 a month.")).toContain("PAY-01");
  });
});

describe("ID-01 claims", () => {
  it("'I went to' names a school, not any errand", () => {
    expect(hits("I went to the back and fought for your number.")).not.toContain("ID-01");
    expect(hits("I went to Coral Gables High, same as you.")).toContain("ID-01");
  });
  it("agreeing with the customer's place is a claim", () => {
    expect(hits("You went to Miami Lakes High? Me too.")).toContain("ID-01");
  });
});
