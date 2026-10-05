import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { dailyPlan, masteryFrom, PracticeSession, pickWarmUp, type Observation, type ScenarioMeta, type WarmUpItem } from "../src/index.js";

const library = platformLibrary();
const cars = [...library.scenarios.values()].filter((s) => s.industry === "cars" && s.status === "active");
const scenarios: ScenarioMeta[] = cars.map((s) => ({ code: s.code, objection: s.objection, difficulty: s.difficulty, weight: library.objections.get(s.objection)?.frequency_weight ?? 1, release1: library.objections.get(s.objection)?.release_1 ?? false }));
const items: WarmUpItem[] = cars.flatMap((s) => (s.scoring?.items ?? []).filter((i) => i.technique).map((i) => ({ code: i.code, scenarioCode: s.code, technique: i.technique!, voiceOnly: i.voice_only === true })));
const obs = (scenarioCode: string, at: string, item: [string, number][]): Observation => ({ at: new Date(at), scenarioCode, mode: "practice", items: item.map(([code, ratio]) => ({ code, ratio })), total: null, honestyPassed: true, partial: true, criticalRules: [] });

describe("warm-up (spec 12.5, decision 0038)", () => {
  it("a rep with no history drills the first behavior of their first onboarding customer, never a voice-only one", () => {
    const pick = pickWarmUp({ scenarios, items, history: [] })!;
    expect(pick.reason).toBe("first");
    expect(items.find((i) => i.code === pick.itemCode && i.scenarioCode === pick.scenarioCode)?.voiceOnly).toBe(false);
    expect(library.techniques.has(pick.technique)).toBe(true);
  });

  it("drills the weakest practiced behavior, on the customer the rep has gone longest without", () => {
    const history = [obs("S-partner-check-L1", "2026-10-01T15:00:00Z", [["O01-ACK", 1], ["O01-QFIRST", 0.2], ["O01-ISOLATE", 0.8]])];
    const pick = pickWarmUp({ scenarios, items, history })!;
    expect(pick).toMatchObject({ itemCode: "O01-QFIRST", scenarioCode: "S-partner-check-L1", reason: "weakest", technique: "T002" });
    // Practiced well three more times (0.2 → 0.6 → 0.8 → 0.9), it is no longer the weakest: ISOLATE (0.8) is.
    const better = [...history, ...["02", "03", "04"].map((d) => obs("S-partner-check-L1", `2026-10-${d}T15:00:00Z`, [["O01-QFIRST", 1]]))];
    expect(pickWarmUp({ scenarios, items, history: better })!.itemCode).toBe("O01-ISOLATE");
  });

  it("is scored on its one behavior: never a pass, a partial score, and honesty still zeroes it", async () => {
    const s = new PracticeSession({ library, scenarioCode: "S-partner-check-L1", language: "es", seed: "warm", exitDraw: 0.5, tenantId: "t", sessionId: "s", textMode: true, mode: "warm_up", focusItem: "O01-QFIRST" });
    s.start();
    const say = async (text: string) => { const g = s.repTurn(text); let step = await g.next(); while (!step.done) step = await g.next(); return step.value; };
    await say("Claro, es una compra grande. ¿Cuál cree que va a ser la primera pregunta de ella?");
    const r = await s.finish();
    expect(r.score.items.map((i) => i.code)).toEqual(["O01-QFIRST"]);
    expect(r.score.passed).toBe(false);
    expect(r.score.partial).toBe(true);
    expect(r.debrief.change.code).toBe("O01-QFIRST");

    const lie = new PracticeSession({ library, scenarioCode: "S-partner-check-L1", language: "en", seed: "warm2", exitDraw: 0.5, tenantId: "t", sessionId: "s2", textMode: true, mode: "warm_up", focusItem: "O01-QFIRST" });
    lie.start();
    const g = lie.repTurn("This one is $32,450 out the door, and that price ends today.");
    let step = await g.next();
    while (!step.done) step = await g.next();
    const r2 = await lie.finish();
    expect(r2.score.honestyPassed).toBe(false);
    expect(r2.score.total).toBe(0);
    expect(r2.debrief.critical.length).toBeGreaterThan(0);
  });

  it("a warm-up teaches one behavior's mastery, never the customer's: onboarding still brings that customer (October 5 review)", () => {
    const now = new Date("2026-10-05T14:00:00Z");
    const itemsByScenario = new Map(cars.map((s) => [s.code, (s.scoring?.items ?? []).map((i) => i.code)]));
    const input = { now, startedAt: now, scenarios, assignments: [], itemsByScenario };
    const first = dailyPlan({ ...input, history: [] })[0]!;
    const warm = pickWarmUp({ scenarios, items, history: [] })!;
    expect(warm.scenarioCode).toBe(first.scenarioCode); // the case the review found: day 1, the same customer
    const warmedUp: Observation = { ...obs(warm.scenarioCode, "2026-10-05T13:00:00Z", [[warm.itemCode, 1]]), mode: "warm_up" };
    expect(dailyPlan({ ...input, history: [warmedUp] })[0]!.scenarioCode).toBe(first.scenarioCode);
    const m = masteryFrom([warmedUp]);
    expect(m.get(`item:${warm.itemCode}`)?.value).toBe(1);
    expect(m.has(`scenario:${warm.scenarioCode}`)).toBe(false);
  });
});
