import { NextResponse } from "next/server";
import { z } from "zod";
import { exitCalibrationInputs, IMPORT_KINDS, importStoreMetrics, lostReasonCounts, monthOf, saveExitCalibration, saveObjectionWeights, type ImportKind } from "@taptics/db";
import { calibrateExits, weighObjections } from "@taptics/session";
import { library } from "@/lib/server";
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
  const result = await asUser(principalOf(user), async (db) => {
    const imported = await importStoreMetrics(db, user, parsed.data.kind, parsed.data.csv);
    // New ups data recalibrates this month's exit rates (spec 19.2 item 1, decision 0011).
    if (imported.ok && parsed.data.kind === "ups") {
      const input = await exitCalibrationInputs(db, user.storeId!);
      await saveExitCalibration(db, user, input.month, { ...calibrateExits(input), ups: input.ups, sessions: input.sessions });
    }
    // New lost-deal reasons reweight the store's objections (spec 19.2 item 2, decision 0018).
    const map = library().lostReasons;
    if (imported.ok && parsed.data.kind === "lost_reasons" && map) {
      await saveObjectionWeights(db, user, monthOf(new Date()), { ...weighObjections(await lostReasonCounts(db, user.storeId!), map) });
    }
    return imported;
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
