import { NextResponse } from "next/server";
import { getSession } from "@/lib/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const live = getSession(id);
  if (!live) return NextResponse.json({ error: "session not found" }, { status: 404 });
  live.result ??= await live.session.finish();
  const r = live.result;
  return NextResponse.json({
    language: r.language,
    offline: r.offline,
    endReason: r.engine.endReason,
    nextStepSecured: r.engine.nextStepSecured,
    debrief: r.debrief,
    score: { total: r.score.total, passed: r.score.passed, partial: r.score.partial, coverage: r.score.coverage, threshold: r.score.threshold, honestyPassed: r.score.honestyPassed, dimensions: r.score.dimensions, items: r.score.items.map((i) => ({ code: i.code, points: i.points, max: i.max, status: i.status, explanation: i.explanation })) },
    transcript: r.transcript.map((t) => ({ index: t.index, speaker: t.speaker, text: t.text })),
  });
}
