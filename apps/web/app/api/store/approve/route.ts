import { NextResponse } from "next/server";
import { approveStoreSetup } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function POST() {
  const user = await apiUser({ roles: ["compliance_reviewer"] });
  if (user instanceof NextResponse) return user;
  if (!user.storeId) return NextResponse.json({ error: "no store" }, { status: 400 });
  await asUser(principalOf(user), (db) => approveStoreSetup(db, user, user.storeId!));
  return NextResponse.json({ ok: true });
}
