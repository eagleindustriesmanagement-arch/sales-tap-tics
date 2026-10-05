/**
 * Training cadence, mastery and certification (spec 15.2-15.4). Pure functions over a rep's history, so the Today
 * screen, the practice list, the manager's certification view and the 30-day simulation all agree.
 */

const DAY = 86_400_000;

export interface ScenarioMeta {
  code: string;
  objection: string;
  difficulty: number;
  /** How often reps meet the objection on the floor. */
  weight: number;
  release1: boolean;
}

/** One finished session, as the scheduler needs it. */
export interface Observation {
  at: Date;
  scenarioCode: string;
  mode: "practice" | "certification" | "warm_up" | "demonstration" | "customer_prep";
  /** Scored rubric items only, each as earned / possible. */
  items: { code: string; ratio: number }[];
  total: number | null;
  honestyPassed: boolean;
  partial: boolean;
  /** The stored verdict: a complete score at or above the pass mark with honesty passed. */
  passed?: boolean;
  /** Rules broken with a critical, confident violation. */
  criticalRules: string[];
}

export interface Mastery {
  value: number;
  lastAt: Date;
  lastFailed: boolean;
}

/** Recent sessions weigh more: each new observation moves the estimate halfway (spec 15.3 item 1). */
const ALPHA = 0.5;
export const MASTERED = 0.7;

function sessionRatio(o: Observation): number | null {
  if (!o.honestyPassed) return 0;
  if (o.total !== null && !o.partial) return o.total / 100;
  if (o.items.length === 0) return null;
  return o.items.reduce((s, i) => s + i.ratio, 0) / o.items.length;
}

/** Mastery per rubric item ("item:U-QFIRST") and per objection ("objection:O01"), from oldest to newest. */
export function masteryFrom(history: Observation[]): Map<string, Mastery> {
  const out = new Map<string, Mastery>();
  const update = (key: string, ratio: number, at: Date, failed: boolean) => {
    const prev = out.get(key);
    const value = prev ? prev.value + ALPHA * (ratio - prev.value) : ratio;
    out.set(key, { value, lastAt: at, lastFailed: failed });
  };
  for (const o of [...history].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (o.mode === "demonstration" || o.mode === "customer_prep") continue;
    for (const i of o.items) update(`item:${i.code}`, i.ratio, o.at, i.ratio < 0.5);
    // A warm-up drills one behavior (decision 0038): it teaches that item's mastery, never the whole customer's.
    if (o.mode === "warm_up") continue;
    const ratio = sessionRatio(o);
    if (ratio !== null) update(`scenario:${o.scenarioCode}`, ratio, o.at, ratio < 0.5 || o.criticalRules.length > 0);
  }
  return out;
}

/** Days before an item is due again: about 2 at low mastery, up to 10 at high, 1 after a failure (spec 15.3 item 2). */
export function intervalDays(m: Mastery): number {
  if (m.lastFailed) return 1;
  const t = Math.min(1, Math.max(0, (m.value - 0.3) / 0.6));
  return Math.round(2 + 8 * t);
}

export function isDue(m: Mastery, now: Date): boolean {
  return now.getTime() - m.lastAt.getTime() >= intervalDays(m) * DAY - DAY / 4;
}

// ---------------------------------------------------------------- certification (spec 15.4)

export const CERT_PASS = 70;
export const CERT_VALID_DAYS = 90;
/** Every rep faces the same customers: certification attempts cycle through these seeds. */
export const CERT_SEEDS = 3;

export function certificationSeed(scenarioCode: string, attempt: number): string {
  return `cert:${scenarioCode}:${attempt % CERT_SEEDS}`;
}

export function certificationPassed(o: Observation): boolean {
  return o.mode === "certification" && o.honestyPassed && !o.partial && o.total !== null && o.total >= CERT_PASS;
}

export type CertState =
  | { state: "certified"; until: Date }
  | { state: "eligible" }
  | { state: "wait"; reason: "24h" | "practice_first"; from: Date };

/** Where a rep stands on one scenario. A failed attempt can be retried after 24 hours and one practice session. */
export function certificationState(code: string, history: Observation[], now: Date): CertState {
  const mine = history.filter((o) => o.scenarioCode === code).sort((a, b) => a.at.getTime() - b.at.getTime());
  const passed = mine.filter(certificationPassed).at(-1);
  if (passed && now.getTime() - passed.at.getTime() < CERT_VALID_DAYS * DAY) return { state: "certified", until: new Date(passed.at.getTime() + CERT_VALID_DAYS * DAY) };
  const lastAttempt = mine.filter((o) => o.mode === "certification").at(-1);
  if (!lastAttempt || certificationPassed(lastAttempt)) return { state: "eligible" };
  if (now.getTime() - lastAttempt.at.getTime() < DAY) return { state: "wait", reason: "24h", from: lastAttempt.at };
  const practicedSince = mine.some((o) => o.mode === "practice" && o.at > lastAttempt.at);
  return practicedSince ? { state: "eligible" } : { state: "wait", reason: "practice_first", from: lastAttempt.at };
}

/** Certified for taking customers alone: every release 1 scenario certified and current (spec 13.5). */
export function levelOneCertified(scenarios: ScenarioMeta[], history: Observation[], now: Date): boolean {
  return scenarios.filter((s) => s.release1).every((s) => certificationState(s.code, history, now).state === "certified");
}

// ---------------------------------------------------------------- the daily plan (spec 15.2, 15.3)

/** A complete score that did not pass (below the pass mark, or the honesty check failed). */
export const failedAttempt = (o: Observation) => !o.partial && o.total !== null && o.passed === false;

export type PlanReason =
  | { kind: "assigned"; assignedBy: string | null; reason: string; dueAt: Date | null }
  | { kind: "onboarding"; week: number }
  | { kind: "compliance"; rule: string }
  | { kind: "retry"; best: number | null }
  | { kind: "due"; items: number; daysSince: number | null }
  | { kind: "certification" }
  | { kind: "recertification" }
  | { kind: "new" };

export interface PlanItem {
  scenarioCode: string;
  mode: "practice" | "certification";
  reason: PlanReason;
}

export interface PlanInput {
  now: Date;
  /** The rep's first day (account creation or first session): day 1 of onboarding. */
  startedAt: Date;
  scenarios: ScenarioMeta[];
  history: Observation[];
  /** Open manager assignments, earliest due first. */
  assignments: { scenarioCode: string; assignedBy: string | null; reason: string; dueAt: Date | null }[];
  /** Rubric item codes each scenario scores, to count how many due items a scenario covers. */
  itemsByScenario: Map<string, string[]>;
  /** Keys the rep's quarterly recertification set. */
  userId?: string;
}

const WEEK_ONE_OBJECTIONS = 5;
const byWeight = (a: ScenarioMeta, b: ScenarioMeta) => b.weight - a.weight || a.difficulty - b.difficulty || a.objection.localeCompare(b.objection);
const ONBOARDING_DAYS = 30;

export function onboardingDay(input: Pick<PlanInput, "now" | "startedAt">): number {
  return Math.floor((input.now.getTime() - input.startedAt.getTime()) / DAY) + 1;
}

/**
 * Release 1 scenarios in the order onboarding teaches them: the first five objections, then the rest by level. An
 * industry with no certification path yet (decision 0033) onboards through all of its own customers the same way.
 */
export function onboardingOrder(scenarios: ScenarioMeta[]): ScenarioMeta[] {
  const certifying = scenarios.filter((s) => s.release1);
  const r1 = certifying.length > 0 ? certifying : scenarios;
  const byObjection = [...r1].sort((a, b) => a.objection.localeCompare(b.objection));
  const first = byObjection.slice(0, WEEK_ONE_OBJECTIONS);
  const rest = byObjection.slice(WEEK_ONE_OBJECTIONS).sort((a, b) => a.difficulty - b.difficulty || b.weight - a.weight || a.objection.localeCompare(b.objection));
  return [...first, ...rest];
}

/**
 * Today's plan, best first: assignments, then a compliance failure from the last session, then onboarding (what has
 * not been tried yet, spread over 30 days), then certification once onboarding is done, then the scenario covering
 * the most due items, preferring ones not seen in the last week.
 */
export function dailyPlan(input: PlanInput, size = 2): PlanItem[] {
  const { now, scenarios, history } = input;
  const plan: PlanItem[] = [];
  const add = (item: PlanItem) => {
    if (plan.length < size && !plan.some((p) => p.scenarioCode === item.scenarioCode)) plan.push(item);
  };
  const known = new Set(scenarios.map((s) => s.code));
  for (const a of input.assignments) if (known.has(a.scenarioCode)) add({ scenarioCode: a.scenarioCode, mode: "practice", reason: { kind: "assigned", ...a } });

  const sorted = [...history].sort((a, b) => a.at.getTime() - b.at.getTime());
  const last = sorted.at(-1);
  if (last && last.criticalRules.length > 0 && now.getTime() - last.at.getTime() < 2 * DAY) {
    add({ scenarioCode: last.scenarioCode, mode: "practice", reason: { kind: "compliance", rule: last.criticalRules[0]! } });
  }

  // A lesson the rep failed is not done: it comes back before anything new (decision 0030). Only a complete score
  // can fail; an offline (partial) score never claims a pass or a failure.
  const passedCodes = new Set(history.filter((o) => o.passed).map((o) => o.scenarioCode));
  const lastFailed = sorted.filter((o) => failedAttempt(o) && !passedCodes.has(o.scenarioCode) && known.has(o.scenarioCode)).at(-1);
  if (lastFailed) {
    const totals = history.filter((o) => o.scenarioCode === lastFailed.scenarioCode && !o.partial && o.total !== null).map((o) => o.total!);
    add({ scenarioCode: lastFailed.scenarioCode, mode: "practice", reason: { kind: "retry", best: totals.length ? Math.round(Math.max(...totals)) : null } });
  }

  // A warm-up on a customer is not having met them: onboarding still brings the full lesson and conversation.
  const tried = new Set(history.filter((o) => o.mode !== "warm_up").map((o) => o.scenarioCode));
  const day = onboardingDay(input);
  const order = onboardingOrder(scenarios);
  const untried = order.filter((s) => !tried.has(s.code));
  if (untried.length > 0) {
    // Week 1 covers the first five objections; weeks 2 to 4 spread the rest so they are all met by day 30.
    const week = Math.min(4, Math.ceil(day / 7));
    const pool = day <= 7 ? untried.filter((s) => order.indexOf(s) < WEEK_ONE_OBJECTIONS) : untried;
    // One new scenario a day; the other slot goes to review (5 practice days in week 1, 15 in weeks 2 to 4).
    const next = (pool.length ? pool : untried)[0]!;
    add({ scenarioCode: next.code, mode: "practice", reason: { kind: "onboarding", week } });
  }

  // A rep certified before renews with the quarter's recertification set instead of redoing all 20 (spec 15.2).
  const recertDue = input.userId ? certifiedForUps(input.userId, scenarios, history, now).recertDue : [];
  for (const code of recertDue) add({ scenarioCode: code, mode: "certification", reason: { kind: "recertification" } });
  const everCertified = scenarios.filter((s) => s.release1).every((s) => history.some((o) => o.scenarioCode === s.code && certificationPassed(o)));

  if (day >= ONBOARDING_DAYS && untried.length === 0 && !everCertified) {
    for (const s of order) {
      if (certificationState(s.code, history, now).state === "eligible") add({ scenarioCode: s.code, mode: "certification", reason: { kind: "certification" } });
    }
  }

  const mastery = masteryFrom(history);
  const dueItems = new Set([...mastery].filter(([k, m]) => k.startsWith("item:") && isDue(m, now)).map(([k]) => k.slice(5)));
  const seenRecently = (code: string) => {
    const m = mastery.get(`scenario:${code}`);
    return m ? now.getTime() - m.lastAt.getTime() < 7 * DAY : false;
  };
  const ranked = scenarios
    .map((s) => {
      const m = mastery.get(`scenario:${s.code}`);
      const covered = (input.itemsByScenario.get(s.code) ?? []).filter((c) => dueItems.has(c)).length + (m && isDue(m, now) ? 1 : 0);
      return { s, covered, m };
    })
    .filter((x) => x.covered > 0)
    .sort((a, b) => Number(seenRecently(a.s.code)) - Number(seenRecently(b.s.code)) || b.covered - a.covered || (a.m?.value ?? 0) - (b.m?.value ?? 0) || b.s.weight - a.s.weight);
  for (const { s, covered, m } of ranked) {
    add({ scenarioCode: s.code, mode: "practice", reason: { kind: "due", items: covered, daysSince: m ? Math.floor((now.getTime() - m.lastAt.getTime()) / DAY) : null } });
  }
  if (plan.length < size) {
    // Past onboarding, the next new customer is the objection that costs the store the most deals (decision 0018).
    const fresh = order.find((s) => !tried.has(s.code)) ?? [...scenarios].filter((s) => !tried.has(s.code)).sort(byWeight)[0];
    if (fresh) add({ scenarioCode: fresh.code, mode: "practice", reason: { kind: "new" } });
  }
  return plan;
}

// ---------------------------------------------------------------- quarterly recertification (spec 15.2, 13.5)

export const RECERT_PASS = 75;
export const RECERT_SET = 3;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** "2026-Q4": recertification sets change each calendar quarter. */
export function quarterOf(d: Date): string {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

/** The quarter's random set for one rep: fixed for the quarter, different between reps and quarters. */
export function recertificationSet(userId: string, quarter: string, scenarios: ScenarioMeta[]): string[] {
  const r1 = scenarios.filter((s) => s.release1).map((s) => s.code).sort();
  return [...r1].sort((a, b) => hashString(`${userId}:${quarter}:${a}`) - hashString(`${userId}:${quarter}:${b}`)).slice(0, RECERT_SET);
}

/**
 * Level 1 status with renewal: certified on every release 1 scenario within 90 days, or certified once and then
 * renewed by passing the quarter's recertification set at level 2 (75) within the last 90 days (spec 15.4).
 */
export function certifiedForUps(userId: string, scenarios: ScenarioMeta[], history: Observation[], now: Date): { certified: boolean; recertDue: string[] } {
  if (levelOneCertified(scenarios, history, now)) return { certified: true, recertDue: [] };
  const everCertified = scenarios.filter((s) => s.release1).every((s) => history.some((o) => o.scenarioCode === s.code && certificationPassed(o)));
  if (!everCertified) return { certified: false, recertDue: [] };
  const set = recertificationSet(userId, quarterOf(now), scenarios);
  const passedL2 = (code: string) =>
    history.some((o) => o.scenarioCode === code && o.mode === "certification" && o.honestyPassed && !o.partial && (o.total ?? 0) >= RECERT_PASS && now.getTime() - o.at.getTime() < CERT_VALID_DAYS * DAY);
  const recertDue = set.filter((c) => !passedL2(c));
  return { certified: recertDue.length === 0, recertDue };
}

// ---------------------------------------------------------------- reminders (spec 15.3 item 5)

export interface PeakWindow {
  /** 0 = Sunday, in the store's time zone. */
  day: number;
  from: string;
  to: string;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + (m ?? 0);
}

/**
 * When to send today's one practice reminder: the rep's chosen time, moved to the end of the store's peak window if
 * it falls inside one; null if a reminder already went out today or the time has passed. Times are local "HH:MM".
 */
export function reminderTime(opts: { chosen: string; weekday: number; nowLocal: string; sentToday: boolean; peaks: PeakWindow[] }): string | null {
  if (opts.sentToday) return null;
  let at = minutes(opts.chosen);
  for (const p of opts.peaks.filter((x) => x.day === opts.weekday)) {
    if (at >= minutes(p.from) && at < minutes(p.to)) at = minutes(p.to);
  }
  if (at >= 24 * 60 || at < minutes(opts.nowLocal)) return null;
  return `${String(Math.floor(at / 60)).padStart(2, "0")}:${String(at % 60).padStart(2, "0")}`;
}

/** Spec 15.3 item 5: the store's peak hours default to Saturday 11:00 to 17:00. */
export const DEFAULT_PEAKS: PeakWindow[] = [{ day: 6, from: "11:00", to: "17:00" }];

/**
 * Whether the reminder job, running every `everyMinutes`, should send now: today's reminder time (moved past peak
 * hours) has come within the last run's window, nothing went out today, and the rep has not practiced yet today.
 */
export function reminderDue(opts: { chosen: string; weekday: number; nowLocal: string; sentToday: boolean; practicedToday: boolean; peaks?: PeakWindow[]; everyMinutes?: number }): boolean {
  if (opts.sentToday || opts.practicedToday) return false;
  const window = opts.everyMinutes ?? 60;
  const now = minutes(opts.nowLocal);
  const from = Math.max(0, now - window + 1);
  const at = reminderTime({ chosen: opts.chosen, weekday: opts.weekday, nowLocal: `${String(Math.floor(from / 60)).padStart(2, "0")}:${String(from % 60).padStart(2, "0")}`, sentToday: false, peaks: opts.peaks ?? DEFAULT_PEAKS });
  return at !== null && minutes(at) <= now;
}

/** The store's calendar day ("2026-10-05"), weekday (0 = Sunday) and clock time ("18:30") at an instant. */
export function storeClock(now: Date, timeZone = "America/New_York") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts["year"]}-${parts["month"]}-${parts["day"]}`, weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts["weekday"]!), time: `${parts["hour"]}:${parts["minute"]}` };
}

// ---------------------------------------------------------------- streak (spec 18.1 Home)

/** Consecutive days with practice, ending today or yesterday, in the store's time zone. */
export function practiceStreak(dates: Date[], now: Date, timeZone = "America/New_York"): number {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const days = new Set(dates.map(day));
  let cursor = new Date(now);
  if (!days.has(day(cursor))) cursor = new Date(cursor.getTime() - DAY);
  let n = 0;
  while (days.has(day(cursor))) {
    n += 1;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return n;
}
