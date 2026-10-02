import { NextResponse } from "next/server";
import { z } from "zod";
import { invitePerson, ROLES } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const Input = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().max(60).optional(),
    email: z.string().trim().email().max(200).optional().or(z.literal("")),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/).optional().or(z.literal("")),
    language: z.enum(["en", "es"]),
    roles: z.array(z.enum(ROLES as [string, ...string[]])).min(1),
  })
  .strict();

/** The general manager adds a person to the store (spec 18.3 Users). */
export async function POST(request: Request) {
  const user = await apiUser({ roles: ["general_manager"] });
  if (user instanceof NextResponse) return user;
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", fields: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const { email, phone, lastName, ...rest } = parsed.data;
  if (!email && !phone) return NextResponse.json({ error: "invalid", fields: ["email"] }, { status: 400 });
  try {
    const id = await asUser(principalOf(user), (db) =>
      invitePerson(db, user, { ...rest, lastName: lastName || undefined, email: email || undefined, phone: phone?.replace(/[^\d+]/g, "") || undefined, roles: rest.roles as never }),
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const taken = error instanceof Error && /users_active_(email|phone)/.test(error.message);
    return NextResponse.json({ error: taken ? "taken" : "failed" }, { status: taken ? 409 : 500 });
  }
}
