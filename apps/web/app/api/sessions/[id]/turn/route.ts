import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { liveSession, persistNewTurns } from "@/lib/server";

const Timing = z
  .object({
    pauseBeforeMs: z.number().int().min(0).max(120_000).optional(),
    wordsPerMinute: z.number().min(20).max(400).optional(),
    asrConfidence: z.number().min(0).max(1).optional(),
    lowConfidence: z.array(z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }).strict()).max(50).optional(),
  })
  .strict();

/**
 * One rep turn. Streams newline-delimited JSON: one {"sentence"} line per customer sentence as it clears the
 * compliance guard, then one {"outcome"} line (spec 5.2 items 5 and 6). Both turns are written to the database.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const s = liveSession(id, user);
  if (!s) return NextResponse.json({ error: "session not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { text?: string; timing?: unknown };
  const text = (body.text ?? "").trim().slice(0, 2000);
  // Spoken turns carry their timing (spec 11.6); out-of-range values are dropped rather than trusted.
  const parsedTiming = Timing.safeParse(body.timing ?? {});
  const timing = parsedTiming.success ? { ...parsedTiming.data, lowConfidence: parsedTiming.data.lowConfidence?.filter((r) => r.end <= text.length && r.start < r.end) } : {};
  if (!text) return NextResponse.json({ error: "empty turn" }, { status: 400 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      try {
        const turn = s.session.repTurn(text, timing);
        let step = await turn.next();
        while (!step.done) {
          send({ sentence: step.value.text });
          step = await turn.next();
        }
        await persistNewTurns(s);
        send({ outcome: { ended: step.value.ended, endReason: step.value.endReason, stoppedOnCritical: Boolean(step.value.stoppedOnCritical) } });
      } catch (error) {
        console.error("turn failed", error instanceof Error ? `${error.constructor.name}: ${error.message}` : "unknown");
        send({ error: "turn failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
