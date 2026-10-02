import { NextResponse } from "next/server";
import { exportSessions, toCsv } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const COLUMNS = ["started_at", "rep", "scenario_code", "mode", "language", "end_reason", "total", "passed", "honesty_passed", "partial", "critical_flags", "overrides"];

/** Sessions and scores as CSV for the store's own records (spec 14.5 item 6). General manager only. */
export async function GET() {
  const user = await apiUser({ roles: ["general_manager"] });
  if (user instanceof NextResponse) return user;
  const rows = await asUser(principalOf(user), (db) => exportSessions(db));
  const day = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows, COLUMNS), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sales-tap-tics-sessions-${day}.csv"`, "cache-control": "no-store" },
  });
}
