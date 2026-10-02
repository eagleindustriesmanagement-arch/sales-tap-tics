import { NextResponse } from "next/server";
import { z } from "zod";
import { addScoreOverride, OVERRIDE_FLAGS } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const Input = z.object({ flag: z.enum(OVERRIDE_FLAGS), reason: z.string().trim().min(3).max(500) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!/^[0-9a-f-]{36}$/.test(id) || !parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    await asUser(principalOf(user), (db) => addScoreOverride(db, user, id, parsed.data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Row-level security hides sessions outside the manager's scope, so they look the same as missing ones.
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 404 });
  }
}
