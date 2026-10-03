import { platformLibrary } from "@taptics/content";
import { describe, expect, it } from "vitest";
import { firstSaid } from "../src/debrief.js";
import type { ScoredTurn } from "../src/types.js";

// Production (October 3): the debrief said a $550 ceiling "has not been said yet" when the customer had said it.
// What came out is read from the transcript, never assumed.
describe("the hidden truth, as it went in this conversation", () => {
  const markers = platformLibrary().personas.get("P-payment-buyer")!.hidden_truth_markers;
  const turn = (index: number, speaker: "rep" | "customer", text: string): ScoredTurn => ({ index, speaker, text, language: "en" }) as ScoredTurn;
  it("names the customer's own line when the ceiling came out", () => {
    const said = firstSaid([turn(0, "customer", "The payment is too high."), turn(1, "rep", "What number works?"), turn(2, "customer", "I can't go over $550 a month, period.")], markers);
    expect(said).toEqual({ turnIndex: 2, quote: "I can't go over $550 a month, period." });
  });
  it("says it never came out when no customer line gave it away", () => {
    expect(firstSaid([turn(0, "customer", "The payment is too high."), turn(1, "rep", "Is $550 a month what you had in mind?")], markers)).toBeNull();
  });
  it("no persona hidden truth claims what the customer has or has not said in the session", () => {
    for (const p of platformLibrary().personas.values()) {
      expect(p.hidden_truth.en, p.code).not.toMatch(/\b(has not|hasn't) (said|mentioned)\b|\bnot said yet\b/i);
      expect(p.hidden_truth.es, p.code).not.toMatch(/\b(todavía no ha dicho|no ha mencionado|no lo ha dicho)\b/i);
    }
  });
});
