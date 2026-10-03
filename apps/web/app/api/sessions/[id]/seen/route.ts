import { NextResponse } from "next/server";
import { markDebriefSeen } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

/** The rep saw their own debrief (spec 19.4). Only the first time counts; anyone else's session is ignored. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const marked = await asUser(principalOf(user), (db) => markDebriefSeen(db, id));
  return NextResponse.json({ marked });
}
