import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { exitDrawFor } from "@taptics/engine";
import { calibrateExits, EXIT_CALIBRATION, PracticeSession, scaleExitPolicy } from "../src/index.js";

const library = platformLibrary();
const policy = { walk_away_base: 0.1, not_now_base: 0.25, triggers_raise_by: 0.25, anchor_no_reason_raise: 0.05, grace_turns: 2 };

describe("exit-rate calibration (spec 19.2 item 1)", () => {
  it("scales toward the store's real share of unsold ups", () => {
    // 80% of real ups leave unsold; 40% of practice ends in an exit: double the rates.
    expect(calibrateExits({ ups: 200, sold: 40, sessions: 50, exits: 20, current: 1 })).toEqual({ status: "updated", multiplier: 2, target: 0.8, observed: 0.4 });
    // Practice exits more often than the floor does: scale down.
    expect(calibrateExits({ ups: 100, sold: 50, sessions: 40, exits: 30, current: 1.5 })).toMatchObject({ multiplier: 1 });
  });

  it("moves at most half or double in a month, and stays within its range", () => {
    expect(calibrateExits({ ups: 100, sold: 5, sessions: 100, exits: 10, current: 1 }).multiplier).toBe(EXIT_CALIBRATION.maxStep);
    expect(calibrateExits({ ups: 100, sold: 99, sessions: 100, exits: 90, current: 1 }).multiplier).toBe(0.5);
    expect(calibrateExits({ ups: 100, sold: 5, sessions: 100, exits: 10, current: 3 }).multiplier).toBe(EXIT_CALIBRATION.max);
    expect(calibrateExits({ ups: 100, sold: 99, sessions: 100, exits: 90, current: 0.3 }).multiplier).toBe(EXIT_CALIBRATION.min);
    expect(calibrateExits({ ups: 100, sold: 20, sessions: 40, exits: 0, current: 1 }).multiplier).toBe(2);
  });

  it("leaves the multiplier alone without enough real ups or practice", () => {
    expect(calibrateExits({ ups: 49, sold: 10, sessions: 500, exits: 100, current: 1.4 })).toEqual({ status: "insufficient_data", multiplier: 1.4, reason: "ups" });
    expect(calibrateExits({ ups: 500, sold: 100, sessions: 29, exits: 3, current: 1 })).toEqual({ status: "insufficient_data", multiplier: 1, reason: "sessions" });
  });

  it("keeps the authored ratio between walk-away and not-now, and every customer winnable", () => {
    expect(scaleExitPolicy(policy, 1)).toBe(policy);
    expect(scaleExitPolicy(policy, 2)).toMatchObject({ walk_away_base: 0.2, not_now_base: 0.5, triggers_raise_by: 0.25 });
    const capped = scaleExitPolicy(policy, 4);
    expect(capped.walk_away_base + capped.not_now_base).toBeCloseTo(EXIT_CALIBRATION.maxExitBase, 3);
    expect(capped.not_now_base / capped.walk_away_base).toBeCloseTo(2.5, 1);
  });

  it("applies to practice only; certification keeps the authored rates", () => {
    const code = "S-partner-check-L1";
    const authored = library.scenarios.get(code)!.exit_policy;
    const make = (mode: "practice" | "certification") => new PracticeSession({ library, scenarioCode: code, language: "en", seed: "c", exitDraw: 0.5, tenantId: "t", sessionId: "s", textMode: true, mode, exitMultiplier: 2 });
    expect(make("practice").scenario.exit_policy).toEqual(scaleExitPolicy(authored, 2));
    expect(make("certification").scenario.exit_policy).toEqual(authored);
    expect(library.scenarios.get(code)!.exit_policy).toEqual(authored);
  });

  it("over 100 attempts the walk-away rate follows the scaled base within 5 points (spec 21.3)", () => {
    const code = "S-partner-check-L1";
    const scaled = scaleExitPolicy(library.scenarios.get(code)!.exit_policy, 1.6);
    let walks = 0;
    for (let k = 0; k < 100; k += 1) if (exitDrawFor("rep-secret", code, k) < scaled.walk_away_base) walks += 1;
    expect(Math.abs(walks / 100 - scaled.walk_away_base)).toBeLessThanOrEqual(0.05);
  });
});
