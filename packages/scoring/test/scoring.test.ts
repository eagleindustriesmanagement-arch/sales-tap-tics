import { describe, expect, it } from "vitest";
import { platformLibrary, scenarioSchema } from "@taptics/content";
import { checkUtterance, STRICTEST_STORE } from "@taptics/rules";
import { buildDebrief, chooseWeeklyCard, FixtureJudge, scoreSession, type EngineFacts, type JudgeResult, type ScoredTurn } from "../src/index.js";

const library = platformLibrary();
const scenario = library.scenarios.get("S-partner-check-L1")!;

/** The spec 10.5 good model, with timing as the gateway would record it. */
function transcript(pauseMs = 2400, language: "en" | "es" = "en"): ScoredTurn[] {
  let clock = 0;
  return scenario.demonstrations.good.script[language].map((line, index) => {
    const words = line.text.split(/\s+/).length;
    const wpm = line.speaker === "rep" ? 170 : 150;
    const pause = line.speaker === "rep" ? (index === 1 ? pauseMs : 900) : 600;
    const startedMs = clock + pause;
    const endedMs = startedMs + (words / wpm) * 60_000;
    clock = endedMs;
    return { index, speaker: line.speaker, text: line.text.replace(/\[[^\]]*\]\s*/g, ""), language, startedMs, endedMs, pauseBeforeMs: line.speaker === "rep" ? pause : undefined, wordsPerMinute: line.speaker === "rep" ? wpm : undefined, asrConfidence: 0.92, isObjection: index === 0 };
  });
}

const full = (turnIndex: number, quote: string) => ({ applicable: true, score: 1, evidence: { turnIndex, quote }, explanation: { en: "Done well.", es: "Bien hecho." } });
const JUDGE_ALL: Partial<JudgeResult> = {
  items: {
    "O01-ACK": full(1, "Of course. It is a big purchase"),
    "O01-QFIRST": full(1, "what do you think her first question will be?"),
    "O01-ISOLATE": full(3, "Setting the conversation with her aside"),
    "O01-PARTNER": full(7, "Would she be free for a quick video call"),
    "U-QFIRST": full(1, "what do you think her first question will be?"),
    "U-ISOLATE": full(3, "Setting the conversation with her aside"),
    "U-SUMMARY": { applicable: false, score: 0, evidence: null, explanation: { en: "No numbers presented.", es: "No se presentaron números." } },
  },
  autoFail: { belittled_partner: { hit: false, evidence: null, explanation: { en: "", es: "" } } },
};
const ENGINE_WIN: EngineFacts = { endReason: "next_step", exit: null, hiddenRevealed: true, nextStepSecured: true, winMet: true };

async function score(opts: { turns?: ScoredTurn[]; judge?: Partial<JudgeResult>; engine?: EngineFacts; textMode?: boolean; violations?: ReturnType<typeof checkUtterance> } = {}) {
  return scoreSession({ library, scenario, transcript: opts.turns ?? transcript(), violations: opts.violations ?? [], engine: opts.engine ?? ENGINE_WIN, judge: new FixtureJudge(opts.judge ?? JUDGE_ALL), textMode: opts.textMode ?? false });
}

describe("O01 scoring table (spec 10.5)", () => {
  it("the model conversation scores 100 and passes level 1", async () => {
    const s = await score();
    expect(s.aggregation).toBe("points");
    expect(s.total).toBe(100);
    expect(s.passed).toBe(true);
    expect(s.items.find((i) => i.code === "O01-PAUSE")!.points).toBe(10);
  });

  it("a 1.2 second pause loses the 10 pause points", async () => {
    const s = await score({ turns: transcript(1200) });
    expect(s.total).toBe(90);
    expect(s.items.find((i) => i.code === "O01-PAUSE")!.explanation.en).toContain("1.2 s");
  });

  it("no hidden gap and no agreed time loses 25 points (75 still clears the level 1 bar of 70)", async () => {
    const s = await score({ engine: { endReason: "not_now", exit: "not_now", hiddenRevealed: false, nextStepSecured: false, winMet: false } });
    expect(s.total).toBe(75);
    expect(s.passed).toBe(true);
  });

  it("text mode excludes the pause instead of scoring it zero (spec 11.5)", async () => {
    const turns = transcript(500).map(({ startedMs, endedMs, pauseBeforeMs, wordsPerMinute, ...t }) => t);
    const s = await score({ turns, textMode: true });
    expect(s.items.find((i) => i.code === "O01-PAUSE")!.status).toBe("excluded_text_mode");
    expect(s.total).toBe(100);
  });

  it("a critical violation fails the attempt: 0 for the attempt (spec 10.5, 13.1)", async () => {
    const violations = checkUtterance(
      { text: "The bonus cash ends tomorrow, so let's decide now.", language: "en", speaker: "rep", turnIndex: 5 },
      { facts: scenario.facts, store: STRICTEST_STORE, channel: "floor", offerLanguage: "en", lexicon: library.lexicon!, rules: [...library.rules.values()], techniques: library.techniques },
    );
    const s = await score({ violations });
    expect(s.honestyPassed).toBe(false);
    expect(s.total).toBe(0);
    expect(s.passed).toBe(false);
    expect(s.autoFails.map((a) => a.code)).toContain("made_up_deadline");
  });

  it("a judge auto-fail (belittled the partner) also fails the attempt", async () => {
    const s = await score({ judge: { ...JUDGE_ALL, autoFail: { belittled_partner: { hit: true, evidence: { turnIndex: 1, quote: "Can't you decide yourself?" }, explanation: { en: "", es: "" } } } } });
    expect(s.honestyPassed).toBe(false);
    expect(s.total).toBe(0);
  });

  it("an item hinging on a low-confidence turn is not scored, not failed (spec 13.4 item 4)", async () => {
    const turns = transcript().map((t) => (t.index === 3 ? { ...t, asrConfidence: 0.3 } : t));
    const judge = { ...JUDGE_ALL, items: { ...JUDGE_ALL.items, "O01-ISOLATE": { applicable: true, score: 0, evidence: { turnIndex: 3, quote: "..." }, explanation: { en: "", es: "" } } } };
    const s = await score({ turns, judge });
    expect(s.items.find((i) => i.code === "O01-ISOLATE")!.status).toBe("not_scored");
    expect(s.total).toBe(100);
  });

  it("scores the Spanish session the same as the English one (spec 21.4 fairness check)", async () => {
    const en = await score();
    const es = await score({ turns: transcript(2400, "es") });
    expect(Math.abs(en.total - es.total)).toBeLessThanOrEqual(2);
  });

  it("runs the universal items alongside for dimensions", async () => {
    const s = await score();
    expect(s.items.find((i) => i.code === "U-TALK")!.status).toBe("scored");
    expect(s.items.find((i) => i.code === "U-ONECLOSE")!.points).toBe(1);
    expect(s.items.find((i) => i.code === "U-LANG")!.points).toBe(1);
    expect(s.items.find((i) => i.code === "U-DEADLINE")!.status).toBe("not_applicable");
    expect(s.dimensions.discovery).not.toBeNull();
  });
});

describe("dimension-weighted scenarios (spec 13.1)", () => {
  it("uses the 13.1 weights when a scenario has no table of its own", async () => {
    const plain = scenarioSchema.parse({ ...scenario, scoring: undefined });
    const s = await scoreSession({ library, scenario: plain, transcript: transcript(1200), violations: [], engine: ENGINE_WIN, judge: new FixtureJudge(JUDGE_ALL), textMode: false });
    expect(s.aggregation).toBe("dimension_weights");
    expect(s.dimensions.composure).toBe(50);
    expect(s.total).toBeLessThan(100);
    expect(s.total).toBeGreaterThan(80);
  });
});

describe("debrief (spec 12.3)", () => {
  it("names one change with its why and never shows a bare score", async () => {
    const turns = transcript(1200);
    const s = await score({ turns });
    const d = buildDebrief({ library, scenario, score: s, transcript: turns, endReason: "next_step" });
    expect(d.change.code).toBe("O01-PAUSE");
    expect(d.change.why.en).toMatch(/slow down/);
    expect(d.change.why.es.length).toBeGreaterThan(10);
    expect(d.worked.length).toBeGreaterThan(0);
    expect(d.hiddenTruth?.en).toContain("$60");
    expect(d.critical).toEqual([]);
  });

  it("puts a critical violation first with the true fact and the compliant line", async () => {
    const violations = checkUtterance(
      { text: "This one is $32,450.", language: "en", speaker: "rep", turnIndex: 5 },
      { facts: scenario.facts, store: STRICTEST_STORE, channel: "floor", offerLanguage: "en", lexicon: library.lexicon!, rules: [...library.rules.values()], techniques: library.techniques },
    );
    const s = await score({ violations });
    const d = buildDebrief({ library, scenario, score: s, transcript: transcript(), endReason: "next_step" });
    expect(d.critical[0]!.rule).toBe("PRICE-01");
    expect(d.critical[0]!.trueFact.en).toContain("$33,349");
    expect(d.critical[0]!.compliantLine?.es).toBeTruthy();
  });

  it("gives a stretch change when everything landed", async () => {
    const s = await score();
    const d = buildDebrief({ library, scenario, score: s, transcript: transcript(), endReason: "next_step" });
    expect(d.change.code.length).toBeGreaterThan(0);
  });
});

describe("weekly behavior card (spec 12.4)", () => {
  it("picks the weakest item that has a floor-check card", async () => {
    const week = [await score({ turns: transcript(1200) }), await score({ turns: transcript(900) }), await score()];
    const choice = chooseWeeklyCard(library, week);
    expect(choice?.card.code).toBe("B-T001-pause");
  });
  it("issues nothing when every carded item was perfect", async () => {
    expect(chooseWeeklyCard(library, [await score()])).toBeNull();
  });
});
