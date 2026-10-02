import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { finishSession, liveSession } from "@/lib/server";
import { debriefPayload } from "@/lib/payload";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const s = liveSession(id, user);
  if (!s) return NextResponse.json({ error: "session not found" }, { status: 404 });
  const r = await finishSession(s, user);
  return NextResponse.json(
    debriefPayload({
      language: r.language,
      offline: r.offline,
      endReason: r.engine.endReason,
      nextStepSecured: r.engine.nextStepSecured,
      score: r.score,
      debrief: r.debrief,
      transcript: r.transcript,
    }),
  );
}
