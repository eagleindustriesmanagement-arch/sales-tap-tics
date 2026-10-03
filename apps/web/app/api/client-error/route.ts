import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { log } from "@/lib/log";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

/**
 * A crash in the browser, reported by the page (decision 0027), written to the structured log so the host's log
 * search shows it. Signed-in users only; small bodies only; the log's own redaction still applies.
 */
export async function POST(request: Request) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const raw = await request.text();
  if (raw.length > 4000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad report" }, { status: 400 });
  }
  log("error", "client_error", {
    area: text(b.area, 40),
    name: text(b.name, 60),
    message: text(b.message, 200),
    frame: text(b.frame, 900),
    digest: text(b.digest, 60),
    path: text(b.path, 120),
    browser: text(b.browser, 20),
    mobile: b.mobile === true,
    translated: b.translated === true,
  });
  return new NextResponse(null, { status: 204 });
}
