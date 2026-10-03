import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { invitePerson, listPeople, listSessions, loadUser, requestLoginCode, requestSignup, resolveLogin, verifyLoginCode, verifySignup, withTenant } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

const SECRET = "test-secret-not-for-production";
let db: pg.Client;
let drop: () => Promise<void>;

beforeAll(async () => {
  if (SKIP) return;
  ({ db, drop } = await scratchDatabase());
  await seedDemo(db, 0);
});
afterAll(async () => {
  if (!SKIP) await drop();
});

async function signUp(email: string, storeName: string) {
  const req = await requestSignup(db, { email, storeName, firstName: "Ana", language: "en" }, SECRET);
  if (req.status !== "sent") throw new Error(`not sent: ${req.status}`);
  const ok = await verifySignup(db, email, req.code, SECRET);
  if (ok.status !== "ok") throw new Error(`not verified: ${ok.status}`);
  return ok;
}

describe.skipIf(SKIP)("a dealership signs up (decision 0029)", () => {
  it("the verified code creates the tenant, its store, default policies and the owner as general manager", async () => {
    const ok = await signUp("Owner@Sunrise-Chevy.test", "Sunrise Chevrolet");
    expect(await resolveLogin(db, ok.token)).toMatchObject({ userId: ok.userId, tenantId: ok.tenantId });
    const gm = await withTenant(db, { tenantId: ok.tenantId, userId: ok.userId }, () => loadUser(db, ok.userId));
    expect(gm).toMatchObject({ tenantId: ok.tenantId, firstName: "Ana", roles: ["general_manager"], stopOnCritical: true, privateWindowHours: 24 });
    const store = await db.query("select s.name, t.name tenant, t.default_language from stores s join tenants t on t.id = s.tenant_id where s.id = $1", [gm!.storeId]);
    expect(store.rows[0]).toEqual({ name: "Sunrise Chevrolet", tenant: "Sunrise Chevrolet", default_language: "en" });
    const audit = await db.query("select action from audit_log where tenant_id = $1", [ok.tenantId]);
    expect(audit.rows.map((r) => r.action)).toEqual(["tenant.signup"]);
    // The email is stored lower-case, so signing in later works in any case.
    const again = await requestLoginCode(db, "OWNER@sunrise-chevy.test", SECRET);
    expect(again.status).toBe("sent");
  });

  it("the new store sees only itself; the demo store cannot see it; the owner invites a rep who signs in", async () => {
    const ok = await signUp("gm@bayside.test", "Bayside Motors");
    const gm = (await withTenant(db, { tenantId: ok.tenantId, userId: ok.userId }, () => loadUser(db, ok.userId)))!;
    await withTenant(db, { tenantId: ok.tenantId, userId: ok.userId }, async () => {
      expect((await listPeople(db, gm.storeId!)).map((p) => p.email)).toEqual(["gm@bayside.test"]);
      expect(await listSessions(db)).toEqual([]);
      const users = await db.query("select email from users");
      expect(users.rows.map((r) => r.email)).toEqual(["gm@bayside.test"]); // row-level security: no demo users
      await invitePerson(db, gm, { firstName: "Luis", email: "Luis@Bayside.test", language: "es", roles: ["rep"] });
    });
    const demoGm = DEMO.users[3]!.id;
    await withTenant(db, { tenantId: DEMO.tenant, userId: demoGm }, async () => {
      const seen = await db.query("select email from users where email like '%bayside%'");
      expect(seen.rowCount).toBe(0);
    });
    const code = await requestLoginCode(db, "luis@bayside.test", SECRET);
    if (code.status !== "sent") throw new Error("not sent");
    const rep = await verifyLoginCode(db, "luis@bayside.test", code.code, SECRET);
    expect(rep).toMatchObject({ status: "ok", tenantId: ok.tenantId });
  });

  it("an email that already has an account creates nothing, and a code for it is not a sign-up code", async () => {
    const before = await db.query("select count(*)::int n from tenants");
    expect((await requestSignup(db, { email: "rep@demo.test", storeName: "Sneaky Motors", language: "en" }, SECRET)).status).toBe("exists");
    expect((await verifySignup(db, "rep@demo.test", "123456", SECRET)).status).toBe("none");
    expect((await db.query("select count(*)::int n from tenants")).rows[0].n).toBe(before.rows[0].n);
  });

  it("a code works once, wrong codes lock it, and requests are rate limited", async () => {
    const req = await requestSignup(db, { email: "once@store.test", storeName: "Once Motors", language: "es" }, SECRET);
    if (req.status !== "sent") throw new Error("not sent");
    expect((await verifySignup(db, "once@store.test", req.code, SECRET)).status).toBe("ok");
    expect((await verifySignup(db, "once@store.test", req.code, SECRET)).status).toBe("none"); // spent; the account now signs in normally

    const lock = await requestSignup(db, { email: "lock@store.test", storeName: "Lock Motors", language: "en" }, SECRET);
    if (lock.status !== "sent") throw new Error("not sent");
    const wrong = lock.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i += 1) expect((await verifySignup(db, "lock@store.test", wrong, SECRET)).status).toBe("invalid");
    expect((await verifySignup(db, "lock@store.test", wrong, SECRET)).status).toBe("locked");
    expect((await verifySignup(db, "lock@store.test", lock.code, SECRET)).status).toBe("locked");
    expect((await db.query("select count(*)::int n from tenants where name = 'Lock Motors'")).rows[0].n).toBe(0);

    for (let i = 0; i < 4; i += 1) expect((await requestSignup(db, { email: "lock@store.test", storeName: "Lock Motors", language: "en" }, SECRET)).status).toBe("sent");
    expect((await requestSignup(db, { email: "lock@store.test", storeName: "Lock Motors", language: "en" }, SECRET)).status).toBe("rate_limited");
  });

  it("refuses a bad email or store name before touching the database", async () => {
    expect((await requestSignup(db, { email: "not-an-email", storeName: "Fine Motors", language: "en" }, SECRET)).status).toBe("invalid");
    expect((await requestSignup(db, { email: "a@b.test", storeName: " x ", language: "en" }, SECRET)).status).toBe("invalid");
  });

  it("pending sign-ups are not readable by the application role", async () => {
    await db.query("begin");
    await db.query("set local role app_user");
    await expect(db.query("select * from signups")).rejects.toThrow(/permission denied/);
    await db.query("rollback");
  });
});
