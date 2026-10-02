import { NextResponse } from "next/server";
import { z } from "zod";
import { approveSpanishCompliance } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const Input = z.object({ code: z.string().min(1), lineKey: z.string().min(1) }).strict();

/** The compliance reviewer signs off a reviewed Spanish line with numbers, fees or conditions (spec 16.3 item 3). */
export async function POST(request: Request) {
  const user = await apiUser({ roles: ["compliance_reviewer"] });
  if (user instanceof NextResponse) return user;
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    await asUser(principalOf(user), (db) => approveSpanishCompliance(db, user, parsed.data.code, parsed.data.lineKey));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "nothing to sign off" }, { status: 409 });
  }
}
