/**
 * What to practice next (spec 15, onboarding order): scenarios never tried come first, easiest and most common
 * first; then the weakest one not yet passed; once everything is passed, the one practiced longest ago (spaced
 * review). Pure, so the Today screen and the schedule agree.
 */
export interface ScenarioInfo {
  code: string;
  difficulty: number;
  /** The objection's frequency weight: how often reps meet it on the floor. */
  weight: number;
}

export interface Progress {
  attempts: number;
  best: number | null;
  passed: boolean;
  lastAt: Date | null;
}

export function recommend(scenarios: ScenarioInfo[], progress: Map<string, Progress>): ScenarioInfo[] {
  const of = (s: ScenarioInfo) => progress.get(s.code);
  const untried = scenarios.filter((s) => !of(s)?.attempts);
  const open = scenarios.filter((s) => of(s)?.attempts && !of(s)!.passed);
  const passed = scenarios.filter((s) => of(s)?.passed);
  untried.sort((a, b) => a.difficulty - b.difficulty || b.weight - a.weight || a.code.localeCompare(b.code));
  open.sort((a, b) => (of(a)!.best ?? 0) - (of(b)!.best ?? 0) || a.difficulty - b.difficulty || a.code.localeCompare(b.code));
  passed.sort((a, b) => (of(a)!.lastAt?.getTime() ?? 0) - (of(b)!.lastAt?.getTime() ?? 0) || a.code.localeCompare(b.code));
  return [...untried, ...open, ...passed];
}
