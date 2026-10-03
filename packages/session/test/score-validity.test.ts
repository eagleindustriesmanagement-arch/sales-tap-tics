import { describe, expect, it } from "vitest";
import { pearson, SCORE_VALIDITY, scoreValidity, type RepPracticeAndOutcome } from "../src/index.js";

const rep = (total: number, closeRate: number, extra: Partial<RepPracticeAndOutcome> = {}): RepPracticeAndOutcome => ({
  sessions: 6,
  scores: { total, composure: 0.5, discovery: total / 100, technique: 0.6, outcome: total / 100 },
  ups: 100,
  sold: Math.round(closeRate * 100),
  ...extra,
});

describe("score validity (spec 19.2 item 3)", () => {
  it("computes Pearson r", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBe(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBe(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it("relates each dimension to close rate, with sample size, and names the ones that relate to nothing", () => {
    const r = scoreValidity([rep(50, 0.1), rep(60, 0.15), rep(70, 0.2), rep(80, 0.24), rep(90, 0.3)]);
    if (r.status !== "computed") throw new Error(r.status);
    expect(r.reps).toBe(5);
    expect(r.closeRate.find((c) => c.measure === "total")).toMatchObject({ n: 5 });
    expect(r.closeRate.find((c) => c.measure === "total")!.r).toBeGreaterThan(0.95);
    // Composure is the same for everyone: no correlation can be computed, so it is not called weak either.
    expect(r.closeRate.find((c) => c.measure === "composure")!.r).toBeNull();
    expect(r.weak).toEqual([]);
    // No add-on data uploaded: nothing to relate.
    expect(r.addonCancellation.every((c) => c.r === null && c.n === 0)).toBe(true);
  });

  it("flips add-on cancellations so a positive r always means a better result", () => {
    const reps = [50, 60, 70, 80, 90].map((t, i) => rep(t, 0.2, { addonsSold: 20, cancelled: 8 - i * 2 }));
    const r = scoreValidity(reps);
    if (r.status !== "computed") throw new Error(r.status);
    expect(r.addonCancellation.find((c) => c.measure === "total")!.r).toBe(1);
  });

  it("waits for enough reps, each with enough practice and real ups", () => {
    expect(scoreValidity([rep(50, 0.1), rep(60, 0.2), rep(70, 0.3), rep(80, 0.3)])).toEqual({ status: "insufficient_data", reps: 4 });
    const thin = [rep(50, 0.1), rep(60, 0.2), rep(70, 0.3), rep(80, 0.3), rep(90, 0.4, { ups: SCORE_VALIDITY.minUps - 1 })];
    expect(scoreValidity(thin)).toEqual({ status: "insufficient_data", reps: 4 });
  });
});
