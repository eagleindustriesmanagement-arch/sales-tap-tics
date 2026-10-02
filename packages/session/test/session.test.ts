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
  it("runs the model conversation to a booked next step with a passing score", async () => {
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
    expect(r.debrief.hiddenTruth?.en).toContain("$60");
    expect(r.offline).toBe(true);
  });

  it("runs in Spanish, and 'follow the customer' starts in the persona's language", async () => {
    const s = session({ language: "follow" });
    expect(s.language).toBe("es");
    expect(s.start().text).toBe(scenario.opening.es);
    const { spoken } = await say(s, "Claro que sí. Cuando lo hablen esta noche, ¿qué cree que ella le va a preguntar primero?");
    expect(spoken[0]).toMatch(/pago|sesenta/);
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

  it("the pre-brief never shows the hidden truth", () => {
    const s = session();
    const brief = JSON.stringify(s.preBrief());
    expect(brief).not.toContain("$60");
    expect(brief).not.toMatch(/told his wife/);
    expect(s.preBrief().brief).toContain(s.engine.variation.name);
  });
});
