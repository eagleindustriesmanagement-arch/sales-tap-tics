import { NextResponse } from "next/server";
import { z } from "zod";
import { ROLES, setPersonStatus, setRoles } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const Input = z
  .object({ roles: z.array(z.enum(ROLES as [string, ...string[]])).min(1).optional(), status: z.enum(["active", "inactive"]).optional() })
  .strict();

/** Change a person's roles or deactivate / reactivate them. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser({ roles: ["general_manager"] });
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    await asUser(principalOf(user), async (db) => {
      if (parsed.data.roles) await setRoles(db, user, id, parsed.data.roles as never);
      if (parsed.data.status) await setPersonStatus(db, user, id, parsed.data.status);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 409 });
  }
}
