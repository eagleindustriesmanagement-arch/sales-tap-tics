import { NextResponse } from "next/server";
import { z } from "zod";
import { IMPORT_KINDS, importStoreMetrics, type ImportKind } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const Input = z.object({ kind: z.enum(Object.keys(IMPORT_KINDS) as [ImportKind, ...ImportKind[]]), csv: z.string().max(1_000_000) }).strict();

/** CSV import of the store's own numbers (spec 19.1). The whole file is accepted or nothing is written. */
export async function POST(request: Request) {
  const user = await apiUser({ roles: ["general_manager"] });
  if (user instanceof NextResponse) return user;
  if (!user.storeId) return NextResponse.json({ error: "no store" }, { status: 400 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await asUser(principalOf(user), (db) => importStoreMetrics(db, user, parsed.data.kind, parsed.data.csv));
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
