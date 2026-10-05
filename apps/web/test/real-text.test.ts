import { describe, expect, it } from "vitest";
import { real } from "../lib/text";

describe("text the AI left as a placeholder (October 5: 'Su respuesta final: …')", () => {
  it("cuts a trailing label that holds only an ellipsis", () => {
    expect(real("Preguntó primero por el pago. Su respuesta final: …")).toBe("Preguntó primero por el pago.");
    expect(real("Asked about the payment first. Your final answer: ...")).toBe("Asked about the payment first.");
    expect(real('Your final answer: "…"')).toBeNull();
  });
  it("hides a line that is only a placeholder", () => {
    expect(real("…")).toBeNull();
    expect(real("“...”")).toBeNull();
    expect(real("Su respuesta final: …")).toBeNull();
    expect(real("")).toBeNull();
    expect(real(null)).toBeNull();
  });
  it("keeps real text, including a real trailing ellipsis", () => {
    expect(real('"Aparte del pago…"')).toBe('"Aparte del pago…"');
    expect(real("Other than the payment…")).toBe("Other than the payment…");
    expect(real("He said: we need to talk it over.")).toBe("He said: we need to talk it over.");
  });
});
