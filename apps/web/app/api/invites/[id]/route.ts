import { NextResponse } from "next/server";
import { revokeInviteLink } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

/** Revokes an invite link: nobody new can join through it, including someone already sent a code. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    await asUser(principalOf(user), (db) => revokeInviteLink(db, user, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
