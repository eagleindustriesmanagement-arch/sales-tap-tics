import { describe, expect, it } from "vitest";
import { detectLanguage, format, missingTranslations, placeholderNames, splitClauses, t } from "../src/index.js";

describe("strings", () => {
  it("has every key in both languages with matching placeholders", () => {
    expect(missingTranslations()).toEqual([]);
  });

  it("reports an empty side and placeholder drift", () => {
    const problems = missingTranslations({ a: { en: "Hi {name}", es: "" }, b: { en: "{x}", es: "{y}" } });
    expect(problems.map((p) => `${p.key}:${p.language}`)).toEqual(["a:es", "a:placeholders", "b:placeholders"]);
  });

  it("fills placeholders", () => {
    expect(t("today.due", "es", { date: "lunes" })).toBe("Vence el lunes");
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

describe("plurals (docs/spanish-style-guide.md section 6)", () => {
  it("chooses the form by each language's own rules, with # as the number", () => {
    expect(t("practice.turnsLeft", "es", { n: 1 })).toBe("Queda 1 turno");
    expect(t("practice.turnsLeft", "es", { n: 3 })).toBe("Quedan 3 turnos");
    expect(t("practice.turnsLeft", "es", { n: 0 })).toBe("Quedan 0 turnos");
    expect(t("practice.turnsLeft", "en", { n: 1 })).toBe("1 turn left");
    expect(t("today.streak", "es", { n: 1 })).toBe("1 día practicando");
    expect(t("plan.due", "es", { days: 1 })).toBe("Toca repasar: hace 1 día que no lo practica.");
    expect(t("validity.cell", "es", { r: "0.4", n: 1 })).toBe("0.4 (1 vendedor)");
    expect(t("floor.recorded", "en", { seconds: 12 })).toBe("Recorded in 12 seconds.");
  });
  it("an exact =N choice wins, and other placeholders still fill", () => {
    expect(format("{n, plural, =0 {Nada} one {# cosa} other {# cosas}} para {name}", "es", { n: 0, name: "Ana" })).toBe("Nada para Ana");
  });
  it("counts the plural's variable as a placeholder both languages must share", () => {
    expect(placeholderNames("{r} ({n, plural, one {# rep} other {# reps}})")).toEqual(["n", "r"]);
  });
});
