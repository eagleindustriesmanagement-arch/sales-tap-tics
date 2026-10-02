import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { coachScene, scoreFloorCheck } from "../src/coach.js";

const library = platformLibrary();
const card = library.behaviorCards.get("B-T002-clarify")!;

describe("coach the coach (spec 14.3)", () => {
  it("scores the spec 14.2 example as a full four-part check, in both languages", () => {
    const en = "I watched your talk with the couple at the Tahoe. When they said the payment was high, you went straight to options. Next time, ask first: 'What number did you have in mind?' Let's try it on your next up. I'll check back after lunch.";
    const es = "Vi su conversación con la pareja de la Tahoe. Cuando dijeron que el pago estaba alto, usted fue directo a las opciones. La próxima vez, pregunte primero: '¿Qué número tenía en mente?' Probémoslo con su próximo cliente. Le pregunto después del almuerzo.";
    expect(scoreFloorCheck(en, "en", card)).toMatchObject({ score: 100, oneBehavior: true, missing: [] });
    expect(scoreFloorCheck(es, "es", card)).toMatchObject({ score: 100, oneBehavior: true, missing: [] });
  });
  it("names what is missing, with the card's model wording", () => {
    const r = scoreFloorCheck("Good job out there, just ask more questions.", "en", card);
    expect(r.parts).toEqual({ saw: false, behavior: false, line: false, check_again: false });
    expect(r.score).toBe(0);
    expect(r.missing.map((m) => m.part)).toEqual(["saw", "behavior", "line", "check_again"]);
    expect(r.missing[2]!.model).toBe(card.floor_check_script.line.en);
  });
  it("more than one behavior at once costs points", () => {
    const r = scoreFloorCheck("I saw you jump to options. Next time ask first: \"What number did you have in mind?\" Also work on your walkaround. Try it on your next up.", "en", card);
    expect(r.oneBehavior).toBe(false);
    expect(r.score).toBe(90);
  });
  it("builds a scene from the technique's flawed line", () => {
    const s = coachScene(library, card, 1);
    expect(s.repName).toBe("Luis");
    expect(s.scene.en).toContain("Luis");
    expect(s.scene.es).toContain("Luis");
  });
});
