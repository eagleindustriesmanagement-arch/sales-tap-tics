import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { liveSession } from "@/lib/server";

/**
 * The conversation so far, for the rep who owns a session that is still open: the practice room uses it to pick a
 * conversation back up after the screen was reloaded or redrawn, instead of starting over.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const s = await liveSession(id, user);
  if (!s || s.result) return NextResponse.json({ error: "session not found" }, { status: 404 });
  const session = s.session;
  return NextResponse.json({
    id,
    scenario: session.scenario.code,
    language: session.language,
    preBrief: session.preBrief(),
    lines: session.transcript.filter((t) => t.speaker === "rep" || t.speaker === "customer").map((t) => ({ speaker: t.speaker, text: t.text })),
  });
}
