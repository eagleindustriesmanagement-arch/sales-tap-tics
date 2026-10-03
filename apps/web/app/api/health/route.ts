import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { aiConfigured, library } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * Health check for uptime monitors (decision 0021): the database answers and the content library is loaded.
 * Booleans and counts only; 503 when something the app needs is down.
 */
export async function GET() {
  const started = Date.now();
  let database = false;
  try {
    await pool().query("select 1");
    database = true;
  } catch {
    database = false;
  }
  let scenarios = 0;
  try {
    scenarios = library().scenarios.size;
  } catch {
    scenarios = 0;
  }
  const ok = database && scenarios > 0;
  return NextResponse.json({ ok, database, scenarios, liveAi: aiConfigured(), ms: Date.now() - started }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
