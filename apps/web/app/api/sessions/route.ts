import { NextResponse } from "next/server";
import { isLanguage } from "@taptics/i18n";
import { apiUser } from "@/lib/auth";
import { aiConfigured, library, startSession } from "@/lib/server";

export async function POST(request: Request) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const body = (await request.json().catch(() => ({}))) as { scenario?: string; language?: string; mode?: string; voice?: boolean };
  const mode = body.mode === "certification" ? "certification" : "practice";
  const scenario = body.scenario && library().scenarios.get(body.scenario);
  if (!scenario || scenario.status !== "active") return NextResponse.json({ error: "unknown scenario" }, { status: 404 });
  const lang = body.language === "follow" ? "follow" : isLanguage(body.language) ? body.language : user.preferredLanguage;
  if (lang !== "follow" && !scenario.language_options.includes(lang)) return NextResponse.json({ error: "language not offered" }, { status: 400 });
  const started = await startSession(user, scenario.code, lang, mode, body.voice === true);
  if ("error" in started) {
    if (started.error === "needs_judge") return NextResponse.json({ error: "needs_judge" }, { status: 409 });
    if (started.error === "not_eligible") return NextResponse.json({ error: "not_eligible" }, { status: 409 });
    return NextResponse.json({ error: "too many sessions started; wait a minute" }, { status: 429 });
  }
  return NextResponse.json({ id: started.id, language: started.session.language, preBrief: started.session.preBrief(), opening: started.opening.text, live: aiConfigured() });
}
