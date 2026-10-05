import { describe, expect, it } from "vitest";
import { real } from "../lib/text";

describe("text the AI left as a placeholder (October 5: 'Su respuesta final: …')", () => {
  it("cuts a trailing placeholder label that holds nothing", () => {
    expect(real("Preguntó primero por el pago. Su respuesta final: …")).toBe("Preguntó primero por el pago.");
    expect(real("Asked about the payment first. Your final answer: ...")).toBe("Asked about the payment first.");
    expect(real("Asked about the payment first. Your final answer: ....")).toBe("Asked about the payment first.");
    expect(real("Asked about the payment first. Your final answer - ...")).toBe("Asked about the payment first.");
    expect(real("Asked about the payment first. Your final answer:")).toBe("Asked about the payment first.");
    expect(real("Buen cierre. Su respuesta final: . . .")).toBe("Buen cierre.");
  });
  it("hides a line that is only a placeholder", () => {
    for (const p of ["…", "“...”", "«…»", "(…)", "[…]", "[quote]", "<rep line>", "Su respuesta final: …", "Su respuesta final: «…»", "Su respuesta final: [...]", 'Your final answer: "…"', "Your final answer:", "", null]) {
      expect(real(p), String(p)).toBeNull();
    }
  });
  it("keeps real words: a real trailing ellipsis, a colon in a sentence, a rep who trailed off after a colon", () => {
    for (const keep of ['"Aparte del pago…"', "Other than the payment…", "He said: we need to talk it over.", "Mire: el pago es $450.", "Lo vemos a las 5:30…", "¿Le parece bien? ¡Perfecto!",
      "Mire, le voy a ser honesto: …", "Bueno, el pago queda así: ...", "Mire, a las 10: ...", "OK so the payment is: ...", "Buenas tardes, ¿cómo está? Le explico: …"]) {
      expect(real(keep), keep).toBe(keep);
    }
  });
});
