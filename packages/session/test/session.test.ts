import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { PracticeSession, type PracticeSessionOptions } from "../src/index.js";

const library = platformLibrary();
const scenario = library.scenarios.get("S-partner-check-L1")!;

function session(over: Partial<PracticeSessionOptions> = {}) {
  return new PracticeSession({ library, scenarioCode: scenario.code, language: "en", seed: "sess", exitDraw: 0.99, tenantId: "t1", sessionId: "s1", textMode: true, ...over });
}

async function say(s: PracticeSession, text: string) {
  const spoken: string[] = [];
  const gen = s.repTurn(text);
  let step = await gen.next();
  while (!step.done) {
    spoken.push(step.value.text);
    step = await gen.next();
  }
  return { spoken, outcome: step.value };
}

describe("offline practice session (spec 12.2, M2 thin slice)", () => {
  it("runs the model conversation to a booked next step, with an honest partial score", async () => {
    const s = session();
    expect(s.start().text).toBe(scenario.opening.en);
    for (const line of scenario.demonstrations.good.script.en.filter((l) => l.speaker === "rep")) {
      const { outcome } = await say(s, line.text.replace(/\[[^\]]*\]\s*/g, ""));
      if (outcome.ended) break;
    }
    const r = await s.finish();
    expect(r.engine.hiddenRevealed).toBe(true);
    expect(r.engine.endReason).toBe("next_step");
    expect(r.violations.filter((v) => v.severity === "critical")).toEqual([]);
    // Offline: the judge items are "not scored", text mode excludes the pause; what remains was earned.
    expect(r.score.items.find((i) => i.code === "O01-PAUSE")!.status).toBe("excluded_text_mode");
    expect(r.score.items.find((i) => i.code === "O01-HIDDEN")!.points).toBe(15);
    expect(r.score.items.find((i) => i.code === "O01-NEXT")!.points).toBe(10);
    expect(r.score.total).toBe(100);
    // ...but only 25 of 100 points were scorable offline, so it is partial and cannot pass (decision 0004).
    expect(r.score.coverage).toBe(0.25); // text-mode exclusions count as unmeasured
    expect(r.score.partial).toBe(true);
    expect(r.score.passed).toBe(false);
    expect(r.debrief.hiddenTruth?.en).toContain("$60");
    expect(r.offline).toBe(true);
  });

  it("runs in Spanish, and 'follow the customer' starts in the persona's language", async () => {
    const s = session({ language: "follow" });
    expect(s.language).toBe("es");
    expect(s.start().text).toBe(scenario.opening.es);
    const { spoken } = await say(s, "Claro que sí. Cuando lo hablen esta noche, ¿qué cree que ella le va a preguntar primero?");
    expect(spoken[0]).toBe("Seguro que por el pago.");
  });

  it("paces the reveal like the model conversation: hint first, then the concern when pressed", async () => {
    const s = session();
    s.start();
    const replies: string[] = [];
    for (const line of scenario.demonstrations.good.script.en.filter((l) => l.speaker === "rep").slice(0, 3)) {
      replies.push((await say(s, line.text.replace(/\[[^\]]*\]\s*/g, ""))).spoken.join(" "));
    }
    const customer = scenario.demonstrations.good.script.en.filter((l) => l.speaker === "customer").slice(1, 4).map((l) => l.text);
    expect(replies).toEqual(customer);
  });

  it("a rep who never asks loses the customer's real concern and the next step", async () => {
    const s = session({ exitDraw: 0.2 }); // in the not-now band
    s.start();
    await say(s, "Sure, but the payment is fine and the car is perfect for you.");
    await say(s, "Let's just do it today.");
    const r = await s.finish();
    expect(r.engine.hiddenRevealed).toBe(false);
    expect(r.engine.exit).toBe("not_now");
    expect(r.score.total).toBeLessThan(70);
    expect(r.score.passed).toBe(false);
  });

  it("stop on critical ends the session at the violation and fails the attempt", async () => {
    const s = session({ stopOnCritical: true });
    s.start();
    const { outcome, spoken } = await say(s, "Honestly the bonus cash ends tomorrow, so you should decide today.");
    expect(spoken).toEqual([]);
    expect(outcome.ended).toBe(true);
    expect(outcome.stoppedOnCritical?.rule).toBe("DEAD-01");
    const r = await s.finish();
    expect(r.score.honestyPassed).toBe(false);
    expect(r.score.total).toBe(0);
    expect(r.debrief.critical[0]!.rule).toBe("DEAD-01");
  });

  it("uses the store's real dealer fee for the all-in price the engine enforces", async () => {
    const s = session({ dealerFees: [{ code: "dealer_fee", cents: 99500 }, { code: "electronic_filing", cents: 19900 }] });
    expect(s.scenario.facts.all_in_price_cents).toBe(3245000 + 99500 + 19900);
    s.start();
    // $33,349 was the scenario's example all-in; with this store's fees it understates the price.
    const before = (await say(s, "Out the door it's $33,349, everything included.")).outcome;
    expect(before.ended).toBe(false);
    const r = await s.finish();
    expect(r.violations.map((v) => v.rule)).toContain("PRICE-01");
    expect(r.violations.find((v) => v.rule === "PRICE-01")!.trueFact.en).toContain("$33,644");
  });

  it("a judge that fails still leaves a debrief: the rules' verdict, partial, never a pass; finishing twice counts nothing twice", async () => {
    const down = { model: "judge", promptVersion: "judge@2", evaluate: async () => { throw new Error("overloaded"); } };
    const s = session({ ai: { client: {} as never, judge: down } });
    s.start();
    const first = await s.finish();
    expect(first.offline).toBe(true);
    expect(first.score.partial).toBe(true);
    expect(first.score.passed).toBe(false);
    expect(first.debrief.change).toBeTruthy();
    const again = await s.finish();
    expect(again.violations.length).toBe(first.violations.length);
  });

  it("without the live judge a score is never a pass, even where the rules alone measure most points (October 5 review)", async () => {
    // These scenarios carry most of their points in rule-measured items (the review found S-no-extras-L2 scoring
    // 100 and passing without the judge; packages/scoring pins that case); no score without the judge may pass.
    for (const code of ["S-no-extras-L2", "S-gap-required-L1", "S-warranty-watcher-L1"]) {
      const sc = library.scenarios.get(code)!;
      const s = new PracticeSession({ library, scenarioCode: code, language: "en", seed: `nojudge-${code}`, exitDraw: 0.99, tenantId: "t1", sessionId: "s1", textMode: false });
      s.start();
      for (const line of sc.demonstrations.good.script.en.filter((l) => l.speaker === "rep")) {
        const { outcome } = await say(s, line.text.replace(/\[[^\]]*\]\s*/g, ""));
        if (outcome.ended) break;
      }
      const r = await s.finish();
      expect(r.score.partial, code).toBe(true);
      expect(r.score.passed, code).toBe(false);
    }
  });

  it("the pre-brief never shows the hidden truth", () => {
    const s = session();
    const brief = JSON.stringify(s.preBrief());
    expect(brief).not.toContain("$60");
    expect(brief).not.toMatch(/told his wife/);
    expect(s.preBrief().brief).toContain(s.engine.variation.name);
  });
});
