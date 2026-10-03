import { NextResponse } from "next/server";
import { createInviteLink, isAdmin } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { appUrl } from "@/lib/delivery";

/**
 * A new invite link for the team (decision 0032). Any manager makes rep links; only admins make manager links. The
 * token is returned once, inside the link; only its hash is kept.
 */
export async function POST(request: Request) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const body = (await request.json().catch(() => ({}))) as { role?: unknown };
  const role = body.role === "manager" ? "manager" : "rep";
  if (role === "manager" && !isAdmin(user)) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const link = await asUser(principalOf(user), (db) => createInviteLink(db, user, role));
  // The configured public address, or the one the manager is on (a preview, or a local run).
  const base = process.env.TAPTICS_APP_URL ? appUrl() : new URL(request.url).origin;
  return NextResponse.json({ id: link.id, role, url: `${base}/join/${link.token}` });
}
