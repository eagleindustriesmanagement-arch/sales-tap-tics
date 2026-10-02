import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { randomUUID } from "node:crypto";
import {
  coachingQuality, createPracticeSession, getSessionDetail, insertTurns, issueCard, listSessions, loadUser, markMissedCards, recordConsent,
  approveSpanishCompliance, assignableReps, coachPracticeSummary, listSpanishReviews, saveSpanishReview, createAssignments, listAssignments, recordCoachPractice, recordFloorCheck, requestLoginCode, resolveLogin, revokeLogin, saveSessionResult, teamOverview, verifyLoginCode, weekCards, weekOf, withTenant,
} from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

const SECRET = "test-secret-not-for-production";
let db: pg.Client;
let drop: () => Promise<void>;
const [REP, REP2, MANAGER, GM] = DEMO.users.map((u) => u.id) as [string, string, string, string];

beforeAll(async () => {
  if (SKIP) return;
  ({ db, drop } = await scratchDatabase());
  await seedDemo(db, 0); // no private window, so manager visibility is testable now
  // A second tenant with the same shape, to prove isolation.
  await db.query("insert into tenants (id, name) values ('99999999-9999-4999-8999-999999999999', 'Other group')");
  await db.query("insert into users (id, tenant_id, first_name, email) values ('99999999-9999-4999-8999-999999999901', '99999999-9999-4999-8999-999999999999', 'Other', 'other@other.test')");
});
afterAll(async () => {
  if (!SKIP) await drop();
});

const as = <T>(userId: string, work: (q: pg.Client) => Promise<T>) => withTenant(db, { tenantId: DEMO.tenant, userId }, () => work(db));

describe.skipIf(SKIP)("login with a one-time code (spec 18.1)", () => {
  it("signs in with the right code, by email (any case) or phone", async () => {
    const req = await requestLoginCode(db, "REP@demo.test", SECRET);
    expect(req.status).toBe("sent");
    if (req.status !== "sent") return;
    const ok = await verifyLoginCode(db, "rep@demo.test", req.code, SECRET);
    expect(ok.status).toBe("ok");
    if (ok.status !== "ok") return;
    expect(ok.userId).toBe(REP);
    const who = await resolveLogin(db, ok.token);
    expect(who).toMatchObject({ userId: REP, tenantId: DEMO.tenant });
    await revokeLogin(db, ok.token);
    expect(await resolveLogin(db, ok.token)).toBeNull();
  });

  it("a code works once", async () => {
    const req = await requestLoginCode(db, "rep2@demo.test", SECRET);
    if (req.status !== "sent") throw new Error("not sent");
    expect((await verifyLoginCode(db, "rep2@demo.test", req.code, SECRET)).status).toBe("ok");
    expect((await verifyLoginCode(db, "rep2@demo.test", req.code, SECRET)).status).toBe("expired");
  });

  it("an unknown identifier looks the same to the caller and stores nothing", async () => {
    expect((await requestLoginCode(db, "nobody@demo.test", SECRET)).status).toBe("unknown");
    expect((await verifyLoginCode(db, "nobody@demo.test", "123456", SECRET)).status).toBe("invalid");
  });

  it("locks the code after five wrong attempts, even if the sixth is right", async () => {
    const req = await requestLoginCode(db, "manager@demo.test", SECRET);
    if (req.status !== "sent") throw new Error("not sent");
    const wrong = req.code === "000000" ? "111111" : "000000";
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push((await verifyLoginCode(db, "manager@demo.test", wrong, SECRET)).status);
    expect(results).toEqual(["invalid", "invalid", "invalid", "invalid", "locked"]);
    expect((await verifyLoginCode(db, "manager@demo.test", req.code, SECRET)).status).toBe("locked");
  });

  it("rate-limits code requests per identifier (spec 20.4)", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await requestLoginCode(db, "gm@demo.test", SECRET)).status);
    expect(statuses.slice(0, 5)).toEqual(["sent", "sent", "sent", "sent", "sent"]);
    expect(statuses[5]).toBe("rate_limited");
  });

  it("an expired code is refused", async () => {
    const req = await requestLoginCode(db, "other@other.test", SECRET);
    if (req.status !== "sent") throw new Error("not sent");
    await db.query("update login_codes set expires_at = now() - interval '1 minute' where user_id = $1", [req.userId]);
    expect((await verifyLoginCode(db, "other@other.test", req.code, SECRET)).status).toBe("expired");
  });

  it("an app session cannot read login codes or sessions of another tenant", async () => {
    const n = await withTenant(db, { tenantId: DEMO.tenant, userId: REP }, () => db.query("select count(*)::int n from login_codes where tenant_id <> $1", [DEMO.tenant]));
    expect(n.rows[0].n).toBe(0);
  });
});

describe.skipIf(SKIP)("repository (spec 6.3, 14)", () => {
  const sessionId = randomUUID();

  it("loads a user's roles, store policy and consent", async () => {
    const before = await as(REP, (q) => loadUser(q, REP));
    expect(before).toMatchObject({ roles: ["rep"], storeId: DEMO.store, privateWindowHours: 0, consentVersion: null });
    await as(REP, (q) => recordConsent(q, before!, "2026-10-01", "es"));
    expect((await as(REP, (q) => loadUser(q, REP)))!.consentVersion).toBe("2026-10-01");
  });

  it("saves a finished session and the rep reads it back", async () => {
    await as(REP, async (q) => {
      const user = (await loadUser(q, REP))!;
      await createPracticeSession(q, user, { id: sessionId, scenarioCode: "S-partner-check-L1", releaseId: null, language: "en", mode: "practice", channel: "floor", textMode: true, seed: "s", exitDraw: 0.5 });
      await insertTurns(q, DEMO.tenant, sessionId, [
        { index: 0, speaker: "customer", text: "I need to talk to my wife.", isObjection: true },
        { index: 1, speaker: "rep", text: "What will she ask first?" },
      ]);
      await saveSessionResult(q, DEMO.tenant, sessionId, {
        endReason: "next_step",
        events: [{ turnIndex: 1, event: "hidden_unlocked", detail: {} }],
        violations: [{ turnIndex: 1, rule: "DEAD-01", severity: "critical", span: { text: "ends tomorrow" }, trueFact: { en: "x", es: "y" }, layer: "deterministic", uncertain: false }],
        score: { rubric: "R-objection", total: 0, passed: false, honestyPassed: false, dimensions: { discovery: 80 }, items: [{ code: "U-QFIRST", points: 0, max: 1, status: "scored" }], judgeModel: null, judgePromptVersion: null, partial: false, coverage: 1 },
        debrief: { change: { code: "U-QFIRST" } },
        usage: [{ purpose: "judge", model: "claude-opus-5-5", promptVersion: "judge@1", inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.0001, latencyMs: 900, firstTokenMs: null, ok: true }],
      });
    });
    const mine = await as(REP, (q) => listSessions(q, { userId: REP }));
    expect(mine.map((s) => s.id)).toEqual([sessionId]);
    expect(mine[0]).toMatchObject({ endReason: "next_step", total: 0, passed: false, partial: false });
    const detail = await as(REP, (q) => getSessionDetail(q, { id: REP, tenantId: DEMO.tenant }, sessionId));
    expect(detail!.turns).toHaveLength(2);
    expect(detail!.debrief).toEqual({ change: { code: "U-QFIRST" } });
  });

  it("another rep cannot see it; the manager can, and the read is audit-logged (spec 3.3 rule 5)", async () => {
    expect(await as(REP2, (q) => listSessions(q))).toEqual([]);
    expect(await as(REP2, (q) => getSessionDetail(q, { id: REP2, tenantId: DEMO.tenant }, sessionId))).toBeNull();
    const seen = await as(MANAGER, (q) => getSessionDetail(q, { id: MANAGER, tenantId: DEMO.tenant }, sessionId));
    expect(seen!.turns).toHaveLength(2);
    const log = await as(GM, (q) => q.query("select actor_id, action from audit_log where action = 'session.read'"));
    expect(log.rows).toEqual([{ actor_id: MANAGER, action: "session.read" }]);
  });

  it("issues one card per rep per week, and the manager records the floor check", async () => {
    expect(await as(MANAGER, (q) => issueCard(q, DEMO.tenant, REP, { code: "B-T002-clarify", itemCode: "U-QFIRST", sessionId }))).toBe(true);
    expect(await as(MANAGER, (q) => issueCard(q, DEMO.tenant, REP, { code: "B-T001-pause", itemCode: "U-PAUSE", sessionId }))).toBe(false);
    const cards = await as(MANAGER, (q) => weekCards(q));
    expect(cards.map((c) => [c.firstName, c.cardCode, c.status])).toEqual([["Luis", "B-T002-clarify", "open"]]);
    expect(await as(REP2, (q) => weekCards(q))).toEqual([]);
    await expect(as(REP2, async (q) => recordFloorCheck(q, (await loadUser(q, REP2))!, { cardIssueId: cards[0]!.id, observed: "yes", note: "", durationSeconds: 30, specificFeedback: true, modeled: true }))).rejects.toThrow(/only managers/);
    await as(MANAGER, async (q) => recordFloorCheck(q, (await loadUser(q, MANAGER))!, { cardIssueId: cards[0]!.id, observed: "partly", note: "Asked once, then pitched", durationSeconds: 42, specificFeedback: true, modeled: true }));
    expect((await as(MANAGER, (q) => weekCards(q)))[0]!.status).toBe("checked");
    const quality = await as(GM, (q) => coachingQuality(q));
    expect(quality[0]).toMatchObject({ manager_id: MANAGER, checks: 1, specific_share: 1, modeled_share: 1, avg_seconds: 42 });
  });

  it("the team view lists reps with practice, card and flags; unchecked past cards become missed", async () => {
    const team = await as(MANAGER, (q) => teamOverview(q));
    const luis = team.find((r) => r.first_name === "Luis");
    expect(luis).toMatchObject({ sessions_this_week: 1, card: "B-T002-clarify", card_status: "checked", critical_flags: 1 });
    await as(MANAGER, (q) => issueCard(q, DEMO.tenant, REP2, { code: "B-T001-pause", itemCode: "U-PAUSE", sessionId: null }, "2026-01-05"));
    expect(await withTenant(db, { tenantId: DEMO.tenant, role: "app_worker" }, () => markMissedCards(db, weekOf()))).toBe(1);
  });
});

describe.skipIf(SKIP)("assignments (spec 14.5 item 4)", () => {
  const ROSA = DEMO.users[4]!.id;
  it("a manager assigns to their reps; each rep sees only their own", async () => {
    const reps = await as(MANAGER, async (q) => assignableReps(q, (await loadUser(q, MANAGER))!));
    expect(reps.map((r) => r.firstName)).toEqual(["Ana", "Luis"]);
    const ids = await as(MANAGER, async (q) =>
      createAssignments(q, (await loadUser(q, MANAGER))!, { userIds: [REP, REP2], scenarioCode: "S-partner-check-L1", dueAt: new Date("2026-10-09T21:00:00Z"), reason: "You pitched before asking twice this week." }),
    );
    expect(ids).toHaveLength(2);
    const luis = await as(REP, (q) => listAssignments(q));
    expect(luis.map((a) => [a.firstName, a.assignedByName, a.reason])).toEqual([["Luis", "Carlos", "You pitched before asking twice this week."]]);
    expect(await as(MANAGER, (q) => listAssignments(q))).toHaveLength(2);
    expect(await as(ROSA, (q) => listAssignments(q))).toEqual([]);
  });

  it("a rep cannot assign, and cannot change what was assigned", async () => {
    await expect(as(REP, async (q) => createAssignments(q, (await loadUser(q, REP))!, { userIds: [REP2], scenarioCode: "S-partner-check-L1", dueAt: null, reason: "" }))).rejects.toThrow(/only a manager/);
    await expect(as(REP, (q) => q.query("insert into assignments (tenant_id, user_id, scenario_code, assigned_by) values ($1, $2, 'S-partner-check-L1', $3)", [DEMO.tenant, REP2, REP]))).rejects.toThrow(/row-level security/);
    await expect(as(REP, (q) => q.query("update assignments set due_at = now() + interval '30 days' where user_id = $1", [REP]))).rejects.toThrow(/only the assigning manager/);
    // Another rep's assignment is invisible, so an update touches nothing.
    const r = await as(REP, (q) => q.query("update assignments set completed_at = now() where user_id = $1", [REP2]));
    expect(r.rowCount).toBe(0);
  });

  it("practicing the assigned scenario completes it", async () => {
    const id = randomUUID();
    await as(REP2, async (q) => {
      const user = (await loadUser(q, REP2))!;
      await createPracticeSession(q, user, { id, scenarioCode: "S-partner-check-L1", releaseId: null, language: "es", mode: "practice", channel: "floor", textMode: true, seed: "a", exitDraw: 0.5 });
      await saveSessionResult(q, DEMO.tenant, id, {
        endReason: "not_now", events: [], violations: [],
        score: { rubric: "R-objection", total: 40, passed: false, honestyPassed: true, dimensions: {}, items: [], judgeModel: null, judgePromptVersion: null, partial: false, coverage: 1 },
        debrief: {}, usage: [],
      });
    });
    expect((await as(REP2, (q) => listAssignments(q, { open: true })))).toEqual([]);
    expect((await as(REP, (q) => listAssignments(q, { open: true })))).toHaveLength(1);
  });
});

describe.skipIf(SKIP)("coach the coach (spec 14.3)", () => {
  it("is private to the manager, visible to the general manager, immutable, and refused to reps", async () => {
    const result = { cardCode: "B-T002-clarify", language: "en" as const, text: "I saw...", parts: { saw: true, behavior: true, line: true, check_again: false }, oneBehavior: true, score: 75 };
    await as(MANAGER, async (q) => recordCoachPractice(q, (await loadUser(q, MANAGER))!, result));
    expect((await as(MANAGER, (q) => coachPracticeSummary(q))).map((r) => [r.first_name, r.sessions, r.avg_score])).toEqual([["Carlos", 1, 75]]);
    expect((await as(GM, (q) => coachPracticeSummary(q))).map((r) => r.first_name)).toEqual(["Carlos"]);
    expect(await as(REP, (q) => coachPracticeSummary(q))).toEqual([]);
    await expect(as(REP, async (q) => recordCoachPractice(q, (await loadUser(q, REP))!, result))).rejects.toThrow(/only managers/);
    // No update grant, and an immutability trigger behind it.
    await expect(as(MANAGER, (q) => q.query("update coach_practice set score = 100"))).rejects.toThrow(/permission denied|immutable/);
  });
});

describe.skipIf(SKIP)("Spanish review (spec 16.3, decision 0010)", () => {
  const ROSA = DEMO.users[4]!.id;
  const YESENIA = DEMO.users[5]!.id;
  const line = { kind: "scenario" as const, code: "S-partner-check-L1", lineKey: "demo.good.6", en: "Honestly, it is about sixty bucks higher than what I said.", esOriginal: "La verdad, está como sesenta dólares por encima.", needsCompliance: true };
  it("the Spanish reviewer approves or edits; reps and managers cannot", async () => {
    await as(YESENIA, async (q) => saveSpanishReview(q, (await loadUser(q, YESENIA))!, { ...line, esFinal: "La verdad, está como sesenta dólares más de lo que le dije." }));
    await expect(as(MANAGER, async (q) => saveSpanishReview(q, (await loadUser(q, MANAGER))!, { ...line, esFinal: "x" }))).rejects.toThrow(/only a Spanish reviewer/);
    await expect(as(REP, (q) => q.query("insert into spanish_reviews (tenant_id, content_kind, content_code, line_key, en_text, es_original, es_final, needs_compliance, reviewed_by) values ($1, 'scenario', 'x', 'y', 'a', 'b', 'c', false, $2)", [DEMO.tenant, REP]))).rejects.toThrow(/row-level security/);
    expect(await as(REP, (q) => listSpanishReviews(q))).toEqual([]);
    expect((await as(GM, (q) => listSpanishReviews(q))).map((r) => r.lineKey)).toEqual(["demo.good.6"]);
  });
  it("a line with numbers needs the compliance reviewer, who cannot rewrite it; a new edit clears the sign-off", async () => {
    await as(ROSA, async (q) => approveSpanishCompliance(q, (await loadUser(q, ROSA))!, line.code, line.lineKey));
    expect((await as(ROSA, (q) => listSpanishReviews(q)))[0]!.complianceBy).toBe(ROSA);
    await expect(as(ROSA, (q) => q.query("update spanish_reviews set es_final = 'otra cosa'"))).rejects.toThrow(/only the Spanish reviewer/);
    await as(YESENIA, async (q) => saveSpanishReview(q, (await loadUser(q, YESENIA))!, { ...line, esFinal: "La verdad, son como sesenta dólares más de lo que le dije." }));
    expect((await as(ROSA, (q) => listSpanishReviews(q)))[0]!.complianceBy).toBeNull();
  });
});
