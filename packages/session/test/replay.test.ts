import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { PracticeSession, replayPracticeSession, type PracticeSessionOptions } from "../src/index.js";

const library = platformLibrary();
const options: Omit<PracticeSessionOptions, "replay"> = { library, scenarioCode: "S-partner-check-L1", language: "en", seed: "replay-seed", exitDraw: 0.99, tenantId: "t", sessionId: "s", textMode: false };

async function say(s: PracticeSession, text: string, timing = {}) {
  const spoken: string[] = [];
  const turn = s.repTurn(text, timing);
  let step = await turn.next();
  while (!step.done) {
    spoken.push(step.value.text);
    step = await turn.next();
  }
  return { spoken: spoken.join(" "), outcome: step.value };
}

describe("rebuilding a live session from its stored turns (serverless hosting)", () => {
  it("rebuilds the same session and continues exactly as the original would", async () => {
    const original = new PracticeSession(options);
    original.start();
    await say(original, "Of course. It is a big purchase and you should both be comfortable. When you talk tonight, what do you think her first question will be?", { pauseBeforeMs: 2400, wordsPerMinute: 160 });
    await say(original, "That makes sense. Setting the conversation with her aside for a second, is this the right car for you?");

    const rebuilt = await replayPracticeSession(options, original.transcript);
    expect(rebuilt.transcript).toEqual(original.transcript);
    expect(rebuilt.engine.state).toBe(original.engine.state);
    expect(rebuilt.preBrief()).toEqual(original.preBrief());

    const next = "And the payment. Is it where you told her it would be?";
    const a = await say(original, next);
    const b = await say(rebuilt, next);
    expect(b.spoken).toBe(a.spoken);
    expect(b.outcome.ended).toBe(a.outcome.ended);
    const ra = await original.finish();
    const rb = await rebuilt.finish();
    expect(rb.score.total).toBe(ra.score.total);
    expect(rb.transcript.find((t) => t.speaker === "rep")?.pauseBeforeMs).toBe(2400);
  });
});
