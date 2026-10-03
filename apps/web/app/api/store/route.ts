import { NextResponse } from "next/server";
import { z } from "zod";
import { saveStoreSetup } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

const feeCode = z.string().regex(/^[a-z][a-z0-9_]{1,30}$/);
/** The wizard's input (spec 3.4), validated before anything is written. */
const SetupInput = z
  .object({
    fees: z
      .array(z.object({ code: feeCode, nameEn: z.string().trim().min(2).max(80), nameEs: z.string().trim().min(2).max(80), amountCents: z.number().int().min(0).max(1_000_000), kind: z.enum(["dealer_mandatory", "government_customer_pays", "optional"]) }).strict())
      .max(20)
      .refine((f) => new Set(f.map((x) => x.code)).size === f.length, "fee codes must be unique"),
    lenders: z.array(z.object({ name: z.string().trim().min(2).max(80), isCreditAcceptance: z.boolean() }).strict()).max(40),
    addOnRemoval: z.enum(["credit_price", "show_alternative", "none_configured"]),
    referralReward: z.enum(["none", "gift", "cash"]),
    textConsentEn: z.string().max(1000),
    textConsentEs: z.string().max(1000),
    privateWindowHours: z.number().int().min(0).max(72),
    audioRetentionDays: z.number().int().min(30).max(365),
    stopOnCritical: z.boolean(),
    walkInMetric: z.enum(["all_logged_ups", "qualified_ups"]),
    languages: z.array(z.enum(["en", "es"])).min(1),
    spanishRegister: z.enum(["usted", "tu"]),
    // No reminders in these windows (spec 15.3 item 5). Optional: a save without it keeps the store's current hours.
    peakHours: z
      .array(z.object({ day: z.number().int().min(0).max(6), from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).strict().refine((w) => w.from < w.to, "a window ends after it starts"))
      .max(14)
      .optional(),
  })
  .strict()
  // Bilingual parity (spec 1.2 item 3): consent wording exists in both languages or in neither.
  .refine((s) => Boolean(s.textConsentEn.trim()) === Boolean(s.textConsentEs.trim()), "consent wording is needed in both languages");

export async function PUT(request: Request) {
  const user = await apiUser({ roles: ["general_manager"] });
  if (user instanceof NextResponse) return user;
  if (!user.storeId) return NextResponse.json({ error: "no store" }, { status: 400 });
  const parsed = SetupInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  await asUser(principalOf(user), (db) => saveStoreSetup(db, user, { storeId: user.storeId!, ...parsed.data }));
  return NextResponse.json({ ok: true });
}
