import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { dailyPlan, OBJECTION_WEIGHTS, weighObjections, type Observation, type ScenarioMeta } from "../src/index.js";

const library = platformLibrary();
const map = library.lostReasons!;

describe("objection weights from lost-deal reasons (spec 19.2 item 2)", () => {
  it("weights each objection by its share of the store's lost deals", () => {
    const r = weighObjections(
      [
        { reason: "payment too high", count: 40 },
        { reason: "trade value", count: 30 },
        { reason: "bought elsewhere", count: 30 },
      ],
      map,
    );
    expect(r.status).toBe("updated");
    if (r.status !== "updated") return;
    expect(r.matched).toBe(100);
    // 40% of lost deals: 1 + 10 × 0.4 = 5, the cap.
    expect(r.weights["O03"]).toBe(OBJECTION_WEIGHTS.max);
    // Trade value spreads over its three objections: 10% each, so 2.
    expect(r.weights["O08"]).toBe(2);
    expect(r.weights["O23"]).toBe(2);
    // Objections the store never named are left out and keep their authored weight.
    expect(r.weights["O28"]).toBeUndefined();
    expect(r.byLabel[0]).toEqual({ label: "Payment", count: 40 });
  });

  it("discounts stated reasons that usually hide another (spec 9: spouse, think it over, no time)", () => {
    const r = weighObjections([{ reason: "Needs to talk to wife", count: 40 }], map);
    if (r.status !== "updated") throw new Error(r.status);
    // Half of each deal stays with "talk to my spouse"; half goes to price, payment, financing and another store.
    expect(r.weights["O01"]).toBe(5);
    expect(r.weights["O03"]).toBe(2.25);
    expect(r.weights["O04"]).toBe(2.25);
    expect(r.weights["O10"]).toBe(2.25);
  });

  it("matches Spanish reasons and takes the first matching entry", () => {
    const r = weighObjections(
      [
        { reason: "lo tiene que consultar con la esposa", count: 10 },
        { reason: "el pago muy alto", count: 10 },
        { reason: "debía más de lo que valía (al revés)", count: 10 },
        { reason: "EV range worries, price", count: 10 },
      ],
      map,
    );
    if (r.status !== "updated") throw new Error(r.status);
    expect(r.byLabel.map((l) => l.label).sort()).toEqual(["Electric vehicle concerns", "Owed more than the trade was worth", "Payment", "Spouse or family"]);
    // Price gets only its quarter of the spouse row's hidden half (1.25 of 40 deals): the "price" in the EV row
    // does not count, because the EV entry comes first.
    expect(r.weights["O04"]).toBe(1.31);
  });

  it("lists reasons it cannot place and does not count them", () => {
    const r = weighObjections(
      [
        { reason: "payment", count: 29 },
        { reason: "zzz other", count: 50 },
      ],
      map,
    );
    expect(r).toEqual({ status: "insufficient_data", matched: 29, unmatched: [{ reason: "zzz other", count: 50 }] });
  });

  it("reorders practice: past onboarding, the next new customer is the costliest objection", () => {
    const base: ScenarioMeta[] = [
      { code: "S-a-L1", objection: "O01", difficulty: 1, weight: 1, release1: true },
      { code: "S-b-L1", objection: "O11", difficulty: 1, weight: 1, release1: false },
      { code: "S-c-L1", objection: "O28", difficulty: 1, weight: 1, release1: false },
    ];
    const now = new Date("2026-12-01T15:00:00Z");
    const history: Observation[] = [{ at: new Date("2026-11-30T15:00:00Z"), scenarioCode: "S-a-L1", mode: "practice", items: [], total: 80, honestyPassed: true, partial: false, criticalRules: [] }];
    const plan = (scenarios: ScenarioMeta[]) => dailyPlan({ now, startedAt: new Date("2026-09-01T00:00:00Z"), scenarios, history, assignments: [], itemsByScenario: new Map() });
    expect(plan(base).at(-1)?.scenarioCode).toBe("S-b-L1");
    const weighted = base.map((s) => (s.objection === "O28" ? { ...s, weight: 3.5 } : s));
    expect(plan(weighted).at(-1)?.scenarioCode).toBe("S-c-L1");
  });

  it("every objection the mapping names exists in the library", () => {
    for (const r of map.reasons) for (const o of [...r.objections, ...r.hides]) expect(library.objections.has(o), `${r.label.en} ${o}`).toBe(true);
  });
});
