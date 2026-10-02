import { describe, expect, it } from "vitest";
import { recommend, type Progress } from "../src/recommend.js";

const s = (code: string, difficulty: number, weight = 1) => ({ code, difficulty, weight });
const p = (attempts: number, best: number | null, passed: boolean, lastAt: string | null = null): Progress => ({ attempts, best, passed, lastAt: lastAt ? new Date(lastAt) : null });

describe("what to practice next", () => {
  const all = [s("hard", 3), s("easy-rare", 1, 1), s("easy-common", 1, 3), s("mid", 2)];
  it("starts with untried scenarios, easiest and most common first", () => {
    expect(recommend(all, new Map()).map((x) => x.code)).toEqual(["easy-common", "easy-rare", "mid", "hard"]);
  });
  it("then the weakest unpassed one, then passed ones by longest since practice", () => {
    const progress = new Map([
      ["easy-common", p(2, 82, true, "2026-10-01")],
      ["easy-rare", p(1, 64, false)],
      ["mid", p(1, 40, false)],
      ["hard", p(3, 90, true, "2026-09-20")],
    ]);
    expect(recommend(all, progress).map((x) => x.code)).toEqual(["mid", "easy-rare", "hard", "easy-common"]);
  });
  it("a partial offline score never counts as passed", () => {
    const progress = new Map([["easy-common", p(1, 100, false)]]);
    expect(recommend(all, progress)[0]!.code).toBe("easy-rare");
  });
});
