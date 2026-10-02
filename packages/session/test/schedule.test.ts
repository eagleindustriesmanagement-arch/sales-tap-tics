import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import {
  certificationSeed, certificationState, certifiedForUps, dailyPlan, intervalDays, isDue, levelOneCertified, masteryFrom, onboardingOrder, practiceStreak, recertificationSet, reminderTime,
  type Observation, type ScenarioMeta,
} from "../src/schedule.js";

const DAY = 86_400_000;
const d = (n: number) => new Date(Date.UTC(2026, 9, 5) + n * DAY + 15 * 3_600_000); // day n at 11:00 in Miami
const obs = (day: number, scenarioCode: string, over: Partial<Observation> = {}): Observation => ({
  at: d(day), scenarioCode, mode: "practice", items: [], total: 60, honestyPassed: true, partial: false, criticalRules: [], ...over,
});

const library = platformLibrary();
const scenarios: ScenarioMeta[] = [...library.scenarios.values()].map((s) => {
  const o = library.objections.get(s.objection)!;
  return { code: s.code, objection: s.objection, difficulty: s.difficulty, weight: o.frequency_weight, release1: o.release_1 };
});
const itemsByScenario = new Map([...library.scenarios.values()].map((s) => [s.code, (s.scoring?.items ?? []).map((i) => i.code)]));

describe("mastery and spacing (spec 15.3)", () => {
  it("weights recent sessions more and spaces practice by mastery", () => {
    const m = masteryFrom([obs(0, "A", { total: 40 }), obs(2, "A", { total: 90 })]).get("scenario:A")!;
    expect(m.value).toBeCloseTo(0.65);
    expect(intervalDays({ value: 0.2, lastAt: d(0), lastFailed: false })).toBe(2);
    expect(intervalDays({ value: 0.95, lastAt: d(0), lastFailed: false })).toBe(10);
    expect(intervalDays({ value: 0.95, lastAt: d(0), lastFailed: true })).toBe(1);
    // Nothing goes more than 10 days without practice.
    expect(isDue({ value: 1, lastAt: d(0), lastFailed: false }, d(10))).toBe(true);
    expect(isDue({ value: 1, lastAt: d(0), lastFailed: false }, d(5))).toBe(false);
  });
  it("a broken honesty rule counts as zero", () => {
    expect(masteryFrom([obs(0, "A", { total: 95, honestyPassed: false })]).get("scenario:A")!.value).toBe(0);
  });
});

describe("certification (spec 15.4)", () => {
  it("passes at 70 with honesty on a complete score, expires after 90 days, and retries need 24 hours and a practice", () => {
    const pass = obs(0, "A", { mode: "certification", total: 72 });
    expect(certificationState("A", [pass], d(1)).state).toBe("certified");
    expect(certificationState("A", [pass], d(91)).state).toBe("eligible");
    const fail = obs(0, "A", { mode: "certification", total: 65 });
    expect(certificationState("A", [fail], d(0.5))).toMatchObject({ state: "wait", reason: "24h" });
    expect(certificationState("A", [fail], d(2))).toMatchObject({ state: "wait", reason: "practice_first" });
    expect(certificationState("A", [fail, obs(1, "A")], d(2)).state).toBe("eligible");
    // An offline (partial) score never certifies.
    expect(certificationState("A", [obs(0, "A", { mode: "certification", total: 100, partial: true })], d(1)).state).not.toBe("certified");
  });
  it("uses a fixed set of seeds so reps face comparable customers", () => {
    expect(certificationSeed("A", 0)).toBe(certificationSeed("A", 3));
    expect(certificationSeed("A", 0)).not.toBe(certificationSeed("A", 1));
  });
});

describe("the daily plan", () => {
  const base = { startedAt: d(0), scenarios, assignments: [], itemsByScenario };
  it("puts assignments first, then a compliance failure from the last session", () => {
    const plan = dailyPlan({ ...base, now: d(3), history: [obs(2, "S-thinker-L1", { criticalRules: ["DEAD-01"] })], assignments: [{ scenarioCode: "S-grinder-L3", assignedBy: "Carlos", reason: "x", dueAt: null }] });
    expect(plan.map((p) => [p.scenarioCode, p.reason.kind])).toEqual([["S-grinder-L3", "assigned"], ["S-thinker-L1", "compliance"]]);
  });
  it("week 1 starts with the first five objections", () => {
    const first = onboardingOrder(scenarios).slice(0, 5).map((s) => s.objection);
    expect(first).toEqual(["O01", "O02", "O03", "O04", "O05"]);
    expect(dailyPlan({ ...base, now: d(0), history: [] })[0]).toMatchObject({ scenarioCode: "S-partner-check-L1", reason: { kind: "onboarding", week: 1 } });
  });
});

describe("a simulated 30-day onboarding (M6 acceptance)", () => {
  it("schedules every release 1 objection and ends with a certification attempt", () => {
    const history: Observation[] = [];
    const attempts = new Map<string, number>();
    const scheduled = new Set<string>();
    let certificationOffered = -1;
    for (let day = 0; day < 40; day += 1) {
      const weekday = new Date(d(day)).getUTCDay();
      if (weekday === 0 || weekday === 6) continue; // practice on weekdays: 5 days a week
      const plan = dailyPlan({ startedAt: d(0), now: d(day), scenarios, history, assignments: [], itemsByScenario });
      expect(plan.length).toBeGreaterThan(0);
      for (const p of plan) {
        scheduled.add(p.scenarioCode);
        if (p.mode === "certification" && certificationOffered < 0) certificationOffered = day;
        // A rep who improves with each attempt on a scenario.
        const n = (attempts.get(p.scenarioCode) ?? 0) + 1;
        attempts.set(p.scenarioCode, n);
        const total = Math.min(95, 50 + 12 * n);
        history.push(obs(day, p.scenarioCode, { mode: p.mode, total, items: [{ code: `I-${p.scenarioCode}`, ratio: total / 100 }] }));
      }
    }
    const release1 = scenarios.filter((s) => s.release1).map((s) => s.code);
    expect(release1).toHaveLength(20);
    expect(release1.filter((c) => !scheduled.has(c))).toEqual([]);
    // Every objection met within the 30-day window, then certification is offered from day 30.
    const firstSeen = new Map<string, number>();
    for (const o of history) if (!firstSeen.has(o.scenarioCode)) firstSeen.set(o.scenarioCode, (o.at.getTime() - d(0).getTime()) / DAY);
    expect(Math.max(...release1.map((c) => firstSeen.get(c)!))).toBeLessThan(30);
    expect(certificationOffered).toBeGreaterThanOrEqual(29);
    expect(certificationOffered).toBeLessThan(32);
    expect(history.some((o) => o.mode === "certification")).toBe(true);
  });
  it("a rep who passes every certification is certified for taking customers alone", () => {
    const history = scenarios.filter((s) => s.release1).map((s) => obs(30, s.code, { mode: "certification", total: 80 }));
    expect(levelOneCertified(scenarios, history, d(31))).toBe(true);
    expect(levelOneCertified(scenarios, history.slice(1), d(31))).toBe(false);
  });
});

describe("quarterly recertification (spec 15.2)", () => {
  const r1 = scenarios.filter((s) => s.release1);
  it("draws a fixed random set per rep and quarter", () => {
    const a = recertificationSet("rep-a", "2026-Q4", scenarios);
    expect(a).toHaveLength(3);
    expect(recertificationSet("rep-a", "2026-Q4", scenarios)).toEqual(a);
    expect(recertificationSet("rep-b", "2026-Q4", scenarios)).not.toEqual(a);
    expect(recertificationSet("rep-a", "2027-Q1", scenarios)).not.toEqual(a);
  });
  it("renews level 1 by passing the quarter's set at 75 after the 90 days run out", () => {
    const first = r1.map((s) => obs(0, s.code, { mode: "certification", total: 80 }));
    const later = d(100);
    const due = certifiedForUps("rep-a", scenarios, first, later);
    expect(due.certified).toBe(false);
    expect(due.recertDue).toHaveLength(3);
    const at = (later.getTime() - d(0).getTime()) / DAY - 1;
    const renewed = [...first, ...due.recertDue.map((c) => obs(at, c, { mode: "certification", total: 76 }))];
    expect(certifiedForUps("rep-a", scenarios, renewed, later)).toEqual({ certified: true, recertDue: [] });
    // 74 is a level 1 pass but not a level 2 recertification.
    const short = [...first, ...due.recertDue.map((c) => obs(at, c, { mode: "certification", total: 74 }))];
    expect(certifiedForUps("rep-a", scenarios, short, later).certified).toBe(false);
  });
});

describe("reminders (spec 15.3 item 5)", () => {
  const peaks = [{ day: 6, from: "11:00", to: "17:00" }];
  it("sends at the chosen time, once a day, never during peak hours", () => {
    expect(reminderTime({ chosen: "09:30", weekday: 6, nowLocal: "08:00", sentToday: false, peaks })).toBe("09:30");
    expect(reminderTime({ chosen: "12:00", weekday: 6, nowLocal: "08:00", sentToday: false, peaks })).toBe("17:00");
    expect(reminderTime({ chosen: "12:00", weekday: 5, nowLocal: "08:00", sentToday: false, peaks })).toBe("12:00");
    expect(reminderTime({ chosen: "12:00", weekday: 5, nowLocal: "08:00", sentToday: true, peaks })).toBeNull();
    expect(reminderTime({ chosen: "07:00", weekday: 5, nowLocal: "08:00", sentToday: false, peaks })).toBeNull();
  });
});

describe("the plan after 90 days", () => {
  it("asks for the quarter's recertification set", () => {
    const history = scenarios.filter((s) => s.release1).map((s) => obs(0, s.code, { mode: "certification", total: 85 }));
    const plan = dailyPlan({ startedAt: d(-30), now: d(100), scenarios, history, assignments: [], itemsByScenario, userId: "rep-a" }, 5);
    const recert = plan.filter((p) => p.reason.kind === "recertification");
    expect(recert.map((p) => p.scenarioCode).sort()).toEqual(recertificationSet("rep-a", "2027-Q1", scenarios).sort());
    expect(recert.every((p) => p.mode === "certification")).toBe(true);
  });
});

describe("practice streak", () => {
  it("counts consecutive days ending today or yesterday, in Miami time", () => {
    const at = (iso: string) => new Date(iso);
    const now = at("2026-10-07T15:00:00Z");
    expect(practiceStreak([at("2026-10-07T13:00:00Z"), at("2026-10-06T22:00:00Z"), at("2026-10-05T12:00:00Z")], now)).toBe(3);
    expect(practiceStreak([at("2026-10-06T22:00:00Z"), at("2026-10-05T12:00:00Z")], now)).toBe(2);
    expect(practiceStreak([at("2026-10-04T12:00:00Z")], now)).toBe(0);
    // 11:30 pm in Miami on the 6th is 03:30 UTC on the 7th: still the 6th for the rep.
    expect(practiceStreak([at("2026-10-07T03:30:00Z")], at("2026-10-07T12:00:00Z"))).toBe(1);
  });
});
