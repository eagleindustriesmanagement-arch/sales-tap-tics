import { describe, expect, it } from "vitest";
import { coachingFocus } from "../src/focus.js";

describe("where to aim coaching (spec 14.4)", () => {
  it("puts middle performers first, then low (extra practice), then high, then reps without complete scores", () => {
    const reps = [55, 90, 70, 62, 81, 40, null].map((s, i) => ({ id: `r${i}`, avgScore: s }));
    const out = coachingFocus(reps).map((r) => [r.avgScore, r.focus]);
    expect(out).toEqual([[62, "coach"], [70, "coach"], [40, "extra_practice"], [55, "extra_practice"], [81, "stretch"], [90, "stretch"], [null, "needs_scores"]]);
  });
  it("with fewer than three scored reps, everyone scored is coached", () => {
    expect(coachingFocus([{ id: "a", avgScore: 50 }, { id: "b", avgScore: 90 }]).map((r) => r.focus)).toEqual(["coach", "coach"]);
  });
});
