import { describe, expect, it } from "vitest";
import { englishNumber, isBargeIn, isEcho, lowConfidenceNumbers, spanishNumber, speakable, TurnTracker, turnTiming } from "../src/index.js";

describe("numbers read aloud (spec 11.4 item 4)", () => {
  it("says money in English", () => {
    expect(speakable("It's $38,450 all in.", "en")).toBe("It's thirty-eight thousand four hundred fifty dollars all in.");
    expect(speakable("$580 a month, or $1 more", "en")).toBe("five hundred eighty dollars a month, or one dollar more");
    expect(speakable("$33,349.50", "en")).toBe("thirty-three thousand three hundred forty-nine dollars and fifty cents");
    expect(speakable("at 4.9% for 72 months in 2026", "en")).toBe("at four point nine percent for 72 months in 2026");
  });

  it("says money in Spanish, with the forms a person uses", () => {
    expect(speakable("Son $38,450 con todo.", "es")).toBe("Son treinta y ocho mil cuatrocientos cincuenta dólares con todo.");
    expect(speakable("$21", "es")).toBe("veintiún dólares");
    expect(speakable("$1", "es")).toBe("un dólar");
    expect(speakable("$100", "es")).toBe("cien dólares");
    expect(speakable("$1,000,000", "es")).toBe("un millón de dólares");
    expect(speakable("$31,500", "es")).toBe("treinta y un mil quinientos dólares");
    expect(speakable("$580.05", "es")).toBe("quinientos ochenta dólares con cinco centavos");
    expect(speakable("al 4.9%", "es")).toBe("al cuatro punto nueve por ciento");
  });

  it("covers the number words themselves", () => {
    expect(englishNumber(0)).toBe("zero");
    expect(englishNumber(1_002_015)).toBe("one million two thousand fifteen");
    expect(spanishNumber(115)).toBe("ciento quince");
    expect(spanishNumber(15)).toBe("quince");
    expect(spanishNumber(50)).toBe("cincuenta");
    expect(spanishNumber(2_500_000)).toBe("dos millones quinientos mil");
    expect(spanishNumber(21_000)).toBe("veintiún mil");
  });
});

describe("turn-taking (spec 11.3)", () => {
  it("tells the customer's echo from the rep talking over them", () => {
    const customer = "Honestly, the payment is about sixty bucks higher than what I told her.";
    expect(isEcho("the payment is about sixty bucks", customer)).toBe(true);
    expect(isBargeIn("the payment is about sixty bucks", customer)).toBe(false);
    expect(isBargeIn("can I ask you something", customer)).toBe(true);
    expect(isBargeIn("okay", customer)).toBe(false);
  });

  it("ends a turn after the silence, never in the middle of a phrase", () => {
    const t = new TurnTracker({ silenceMs: 700, maxTurnMs: 90_000 });
    expect(t.due(0)).toBe(false);
    t.heard("of course it is", false, 1000);
    t.heard("of course it is a big purchase", true, 1500, 0.9);
    expect(t.due(2100)).toBe(false);
    t.heard("when you talk", false, 2100);
    expect(t.due(3500)).toBe(false); // an interim is still open
    t.heard("when you talk tonight", true, 2600, 0.8);
    expect(t.due(3200)).toBe(false);
    expect(t.due(3300)).toBe(true);
    expect(t.text).toBe("of course it is a big purchase when you talk tonight");
    expect(t.meanConfidence()).toBeCloseTo(0.85);
  });

  it("ends a monologue at the limit", () => {
    const t = new TurnTracker({ silenceMs: 700, maxTurnMs: 5000 });
    t.heard("and another thing", false, 0);
    expect(t.due(5000)).toBe(true);
  });

  it("measures the pause and the speaking rate for scoring (spec 11.6)", () => {
    expect(turnTiming({ text: "I appreciate you telling me that", customerEndedAt: 10_000, speechStartedAt: 12_400, speechEndedAt: 14_400 })).toEqual({ pauseBeforeMs: 2400, wordsPerMinute: 180 });
    // Too short to judge a rate; speech before the customer finished is not a pause.
    expect(turnTiming({ text: "okay", customerEndedAt: 10_000, speechStartedAt: 9_000, speechEndedAt: 9_500 })).toEqual({});
  });

  it("marks every number uncertain when the recognizer was unsure (spec 11.1 item 4)", () => {
    expect(lowConfidenceNumbers("It's $38,450 or 580 a month", 0.6)).toEqual([{ start: 5, end: 12 }, { start: 16, end: 19 }]);
    expect(lowConfidenceNumbers("It's $38,450", 0.9)).toEqual([]);
    expect(turnTiming({ text: "$580", customerEndedAt: null, speechStartedAt: null, speechEndedAt: null, confidence: 0.5 }).lowConfidence).toEqual([{ start: 0, end: 4 }]);
  });
});
