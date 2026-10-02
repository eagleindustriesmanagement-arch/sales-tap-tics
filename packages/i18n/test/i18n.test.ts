import { describe, expect, it } from "vitest";
import { detectLanguage, missingTranslations, splitClauses, t } from "../src/index.js";

describe("strings", () => {
  it("has every key in both languages with matching placeholders", () => {
    expect(missingTranslations()).toEqual([]);
  });

  it("reports an empty side and placeholder drift", () => {
    const problems = missingTranslations({ a: { en: "Hi {name}", es: "" }, b: { en: "{x}", es: "{y}" } });
    expect(problems.map((p) => `${p.key}:${p.language}`)).toEqual(["a:es", "a:placeholders", "b:placeholders"]);
  });

  it("fills placeholders", () => {
    expect(t("today.due", "es", { date: "lunes" })).toBe("Para el lunes");
  });
});

describe("detectLanguage", () => {
  it("detects English and Spanish", () => {
    expect(detectLanguage("I need to talk to my wife before I do anything")).toBe("en");
    expect(detectLanguage("Tengo que hablarlo con mi esposa antes de hacer nada")).toBe("es");
  });

  it("does not treat Miami dealer terms as English inside Spanish", () => {
    expect(detectLanguage("¿Y cuánto es el down con el trade-in?")).toBe("es");
  });

  it("flags real mixing", () => {
    expect(detectLanguage("Mire, the payment is too high para mi presupuesto, you know, no puedo")).toBe("mixed");
  });

  it("returns unknown for very short text", () => {
    expect(detectLanguage("OK")).toBe("unknown");
  });

  it("splits clauses", () => {
    expect(splitClauses("This number holds. If not, we redo it.")).toEqual(["This number holds.", "If not, we redo it."]);
  });
});
