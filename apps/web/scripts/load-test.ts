/**
 * Load test (spec 5.6, M7): N reps practice at once against a running server with the offline customer, while a
 * manager loads the team view. Measures the server's share of a turn (everything except speech and the model),
 * post-session scoring, and dashboard page load. Uses its own tenant so demo data is untouched.
 *   BASE_URL=http://localhost:3300 DATABASE_URL=... TAPTICS_CODE_OUTBOX=... REPS=25 tsx scripts/load-test.ts
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3300";
const OUTBOX = process.env.TAPTICS_CODE_OUTBOX!;
const REPS = Number(process.env.REPS ?? 25);
const TENANT = "44444444-4444-4444-8444-444444444444";
const STORE = "44444444-4444-4444-8444-444444444401";
const LINES = [
  "Of course, take your time. What would you want to be sure about before you decide?",
  "That makes sense. Setting that aside for a second, is this the right vehicle for you?",
  "What would your family say is the most important thing about it?",
  "If we could sort that out, would you want to take another look together?",
  "Would tomorrow at 5:30 work for you to come back?",
];

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("insert into tenants (id, name) values ($1, 'Load test group') on conflict do nothing", [TENANT]);
await db.query("insert into stores (id, tenant_id, name, brands) values ($1, $2, 'Load test store', '{Chevrolet}') on conflict do nothing", [STORE, TENANT]);
await db.query("insert into store_policies (tenant_id, store_id, private_window_hours) values ($1, $2, 0) on conflict (store_id) do nothing", [TENANT, STORE]);
const users = [...Array(REPS).keys()].map((i) => ({ email: `load-${i}@load.test`, role: "rep" })).concat([{ email: "load-manager@load.test", role: "manager" }]);
for (const u of users) {
  const r = await db.query("insert into users (tenant_id, first_name, email) values ($1, $2, $3) on conflict do nothing returning id", [TENANT, u.email.split("@")[0], u.email]);
  const id = r.rows[0]?.id ?? (await db.query("select id from users where email = $1", [u.email])).rows[0].id;
  await db.query("insert into memberships (tenant_id, user_id, store_id, role) select $1, $2, $3, $4 where not exists (select 1 from memberships where user_id = $2)", [TENANT, id, STORE, u.role]);
}
// Earlier runs leave login codes behind; clear them so the per-identifier rate limit does not trip.
await db.query("delete from login_codes where user_id in (select id from users where email like '%@load.test')");
await db.end();

async function signIn(email: string): Promise<string> {
  const req = await fetch(`${BASE}/api/auth/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: email }) });
  if (!req.ok) throw new Error(`request ${req.status}`);
  const code = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code: string }).filter((m) => m.identifier === email).at(-1)!.code;
  const ver = await fetch(`${BASE}/api/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: email, code }) });
  const cookie = ver.headers.get("set-cookie")?.split(";")[0];
  if (!ver.ok || !cookie) throw new Error(`verify ${ver.status}`);
  const consent = await fetch(`${BASE}/api/consent`, { method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded" }, body: "lang=en", redirect: "manual" });
  if (consent.status !== 303) throw new Error(`consent ${consent.status}`);
  return cookie;
}

const turnMs: number[] = [];
const firstTurnMs: number[] = [];
const laterTurnMs: number[] = [];
const finishMs: number[] = [];
const pageMs: number[] = [];
const errors: string[] = [];

async function timed<T>(sink: number[], work: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  const out = await work();
  sink.push(performance.now() - t0);
  return out;
}

async function rep(email: string) {
  const cookie = await signIn(email);
  const start = await fetch(`${BASE}/api/sessions`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ scenario: "S-thinker-L1", language: "en" }) });
  if (!start.ok) throw new Error(`start ${start.status}`);
  const { id } = (await start.json()) as { id: string };
  for (const [i, text] of LINES.entries()) {
    const body = await timed(i === 0 ? firstTurnMs : laterTurnMs, async () => {
      const r = await fetch(`${BASE}/api/sessions/${id}/turn`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ text }) });
      return r.text();
    });
    if (body.includes('"error"')) throw new Error("turn error");
    if (body.includes('"ended":true')) break;
  }
  const fin = await timed(finishMs, () => fetch(`${BASE}/api/sessions/${id}/finish`, { method: "POST", headers: { cookie } }));
  if (!fin.ok) throw new Error(`finish ${fin.status}`);
}

const managerCookie = await signIn("load-manager@load.test");
let running = true;
const dashboard = (async () => {
  while (running) {
    await timed(pageMs, async () => (await fetch(`${BASE}/manager/team`, { headers: { cookie: managerCookie } })).text());
  }
})();
const t0 = performance.now();
await Promise.all(users.filter((u) => u.role === "rep").map((u) => rep(u.email).catch((e: Error) => errors.push(`${u.email}: ${e.message}`))));
running = false;
await dashboard;

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!) : NaN;
};
console.log(`${REPS} reps at once, ${((performance.now() - t0) / 1000).toFixed(1)} s, errors: ${errors.length}`);
turnMs.push(...firstTurnMs, ...laterTurnMs);
console.log(`turn (server share, offline customer): n=${turnMs.length} p50=${pct(turnMs, 50)} ms p95=${pct(turnMs, 95)} ms`);
console.log(`  first turn of each session: p50=${pct(firstTurnMs, 50)} ms p95=${pct(firstTurnMs, 95)} ms; later turns: p50=${pct(laterTurnMs, 50)} ms p95=${pct(laterTurnMs, 95)} ms`);
console.log(`post-session scoring: n=${finishMs.length} p50=${pct(finishMs, 50)} ms p95=${pct(finishMs, 95)} ms`);
console.log(`team dashboard page: n=${pageMs.length} p50=${pct(pageMs, 50)} ms p95=${pct(pageMs, 95)} ms`);
if (errors.length) console.log(errors.slice(0, 5).join("\n"));
process.exit(errors.length ? 1 : 0);
