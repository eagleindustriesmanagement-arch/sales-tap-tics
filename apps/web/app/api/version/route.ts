import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The build the server is running, never cached: the app compares it with its own to catch a stale phone. */
export function GET() {
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" }, { headers: { "cache-control": "no-store, max-age=0" } });
}
