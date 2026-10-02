import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { PracticeSession } from "../src/index.js";

/**
 * Release gate for every scenario (spec 22, M4): played offline in both languages, the good demonstration reaches
 * the hidden truth and the scenario's win with no critical violation; the flawed one never reaches the hidden truth.
 */
const library = platformLibrary();

async function play(code: string, language: "en" | "es", kind: "good" | "flawed") {
  const scenario = library.scenarios.get(code)!;
  const s = new PracticeSession({ library, scenarioCode: code, language, seed: `gate-${code}`, exitDraw: 0.99, tenantId: "t", sessionId: "s", textMode: true });
  s.start();
  for (const line of scenario.demonstrations[kind].script[language].filter((l) => l.speaker === "rep")) {
    const gen = s.repTurn(line.text.replace(/\[[^\]]*\]\s*/g, ""));
    let step = await gen.next();
    while (!step.done) step = await gen.next();
    if (step.value.ended) break;
  }
  return s.finish();
}

describe("every scenario plays through offline", () => {
  for (const scenario of library.scenarios.values()) {
    for (const language of ["en", "es"] as const) {
      it(`${scenario.code} ${language}: the good model wins honestly`, async () => {
        const r = await play(scenario.code, language, "good");
        expect(r.violations.filter((v) => v.severity === "critical" && !v.uncertain)).toEqual([]);
        expect(r.engine.hiddenRevealed).toBe(true);
        expect(r.engine.winMet).toBe(true);
        expect(["next_step", "sale"]).toContain(r.engine.endReason);
      });
      it(`${scenario.code} ${language}: the flawed model never reaches the hidden truth`, async () => {
        const r = await play(scenario.code, language, "flawed");
        expect(r.engine.hiddenRevealed).toBe(false);
        expect(r.engine.winMet).toBe(false);
      });
    }
  }
});
