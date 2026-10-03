import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { loadStoreSetup, loadUser, markReminderSent, saveStoreSetup, reminderCandidates, removePushSubscription, savePushSubscription, withTenant } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

let db: pg.Client;
let drop: () => Promise<void>;
const [REP, REP2, , GM] = DEMO.users.map((u) => u.id) as [string, string, string, string];
const as = <T>(userId: string, work: (q: pg.Client) => Promise<T>) => withTenant(db, { tenantId: DEMO.tenant, userId }, () => work(db));
const worker = <T>(work: (q: pg.Client) => Promise<T>) => withTenant(db, { tenantId: DEMO.tenant, role: "app_worker" }, () => work(db));
const sub = (n: number) => ({ endpoint: `https://push.example.test/${n}`, p256dh: `key${n}`, auth: `auth${n}` });

beforeAll(async () => {
  if (SKIP) return;
  ({ db, drop } = await scratchDatabase());
  await seedDemo(db, 0);
});
afterAll(async () => {
  if (!SKIP) await drop();
});

describe.skipIf(SKIP)("practice reminders by Web Push (spec 15.3 item 5)", () => {
  it("each person keeps their own phones; nobody else reads or removes them", async () => {
    const rep = (await as(REP, (q) => loadUser(q, REP)))!;
    await as(REP, (q) => savePushSubscription(q, rep, sub(1)));
    // Saving the same phone again changes nothing; another person cannot take it over.
    await as(REP, (q) => savePushSubscription(q, rep, sub(1)));
    const rep2 = (await as(REP2, (q) => loadUser(q, REP2)))!;
    await as(REP2, (q) => savePushSubscription(q, rep2, sub(1)));
    expect((await db.query("select user_id from push_subscriptions")).rows).toEqual([{ user_id: REP }]);
    for (const who of [REP2, GM]) expect((await as(who, (q) => q.query("select * from push_subscriptions"))).rowCount).toBe(0);
    await as(REP2, (q) => removePushSubscription(q, sub(1).endpoint));
    expect((await db.query("select count(*)::int n from push_subscriptions")).rows[0].n).toBe(1);
    // Writing a row for someone else is refused.
    await expect(as(REP2, (q) => q.query("insert into push_subscriptions (tenant_id, user_id, endpoint, p256dh, auth) values ($1, $2, 'https://x.test/2', 'k', 'a')", [DEMO.tenant, REP]))).rejects.toThrow(/row-level security/);
  });

  it("the job sees people with a time and a phone, whether they practiced, and records one reminder a day", async () => {
    await db.query("update users set reminder_time = '18:30' where id = $1", [REP]);
    const day = "2026-10-05";
    const [c] = await worker((q) => reminderCandidates(q, day));
    expect(c).toMatchObject({ userId: REP, reminderTime: "18:30", sentToday: false, subscriptions: [sub(1)] });
    expect(await worker((q) => markReminderSent(q, DEMO.tenant, REP, day, 1))).toBe(true);
    expect(await worker((q) => markReminderSent(q, DEMO.tenant, REP, day, 1))).toBe(false);
    expect((await worker((q) => reminderCandidates(q, day)))[0]!.sentToday).toBe(true);
    // The send log is the job's alone.
    expect((await as(GM, (q) => q.query("select * from reminders_sent"))).rowCount).toBe(0);
    // The store's peak hours reach the job; a save without them keeps them.
    expect((await worker((q) => reminderCandidates(q, day)))[0]!.peaks).toEqual([{ day: 6, from: "11:00", to: "17:00" }]);
    const gm = (await as(GM, (q) => loadUser(q, GM)))!;
    const setup = (await as(GM, (q) => loadStoreSetup(q, DEMO.store)))!;
    const { storeName: _n, approvedBy: _b, approvedAt: _a, ...input } = setup;
    await as(GM, (q) => saveStoreSetup(q, gm, { ...input, peakHours: [{ day: 0, from: "12:00", to: "16:00" }] }));
    const { peakHours: _p, ...withoutPeaks } = input;
    await as(GM, (q) => saveStoreSetup(q, gm, withoutPeaks));
    expect((await worker((q) => reminderCandidates(q, day)))[0]!.peaks).toEqual([{ day: 0, from: "12:00", to: "16:00" }]);
    await removePushSubscriptionAs(REP);
    expect(await worker((q) => reminderCandidates(q, day))).toEqual([]);
  });
});

async function removePushSubscriptionAs(userId: string) {
  await as(userId, (q) => removePushSubscription(q, sub(1).endpoint));
}
