import { NextResponse } from "next/server";
import { isLanguage } from "@taptics/i18n";
import { aiConfigured, createSession, library } from "@/lib/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { scenario?: string; language?: string };
  const scenario = body.scenario && library().scenarios.get(body.scenario);
  if (!scenario) return NextResponse.json({ error: "unknown scenario" }, { status: 404 });
  const lang = body.language === "follow" ? "follow" : isLanguage(body.language) ? body.language : "en";
  if (lang !== "follow" && !scenario.language_options.includes(lang)) return NextResponse.json({ error: "language not offered" }, { status: 400 });
  const { id, session } = createSession(scenario.code, lang);
  const opening = session.start();
  return NextResponse.json({ id, language: session.language, preBrief: session.preBrief(), opening: opening.text, live: aiConfigured() });
}
