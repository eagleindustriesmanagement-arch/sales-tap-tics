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

export type PlanReason =
  | { kind: "assigned"; assignedBy: string | null; reason: string; dueAt: Date | null }
  | { kind: "onboarding"; week: number }
  | { kind: "compliance"; rule: string }
  | { kind: "due"; items: number; daysSince: number | null }
  | { kind: "certification" }
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
}

const WEEK_ONE_OBJECTIONS = 5;
const ONBOARDING_DAYS = 30;

export function onboardingDay(input: Pick<PlanInput, "now" | "startedAt">): number {
  return Math.floor((input.now.getTime() - input.startedAt.getTime()) / DAY) + 1;
}

/** Release 1 scenarios in the order onboarding teaches them: the first five objections, then the rest by level. */
export function onboardingOrder(scenarios: ScenarioMeta[]): ScenarioMeta[] {
  const r1 = scenarios.filter((s) => s.release1);
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

  const tried = new Set(history.map((o) => o.scenarioCode));
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

  if (day >= ONBOARDING_DAYS && untried.length === 0) {
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
    .sort((a, b) => Number(seenRecently(a.s.code)) - Number(seenRecently(b.s.code)) || b.covered - a.covered || (a.m?.value ?? 0) - (b.m?.value ?? 0));
  for (const { s, covered, m } of ranked) {
    add({ scenarioCode: s.code, mode: "practice", reason: { kind: "due", items: covered, daysSince: m ? Math.floor((now.getTime() - m.lastAt.getTime()) / DAY) : null } });
  }
  if (plan.length === 0) {
    const fresh = order.find((s) => !tried.has(s.code)) ?? scenarios.find((s) => !tried.has(s.code));
    if (fresh) add({ scenarioCode: fresh.code, mode: "practice", reason: { kind: "new" } });
  }
  return plan;
}
