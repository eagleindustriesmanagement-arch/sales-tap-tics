import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { aiConfigured, language, lessonFor, library, warmUpItems } from "@/lib/server";
import { PracticeRoom, type RoomScenario, type WarmUp } from "@/components/practice-room";

export default async function Practice({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ mode?: string; warmup?: string }> }) {
  await requireUser();
  const { code } = await params;
  const query = await searchParams;
  const lib = library();
  const s = lib.scenarios.get(code);
  if (!s) notFound();
  // A warm-up drills one of this customer's behaviors (decision 0038); an unknown one falls back to practice.
  const drilled = query.warmup ? warmUpItems(lib).find((i) => i.scenarioCode === code && i.code === query.warmup) : undefined;
  const mode = query.mode === "certification" ? "certification" : drilled ? "warm_up" : "practice";
  const warmUp: WarmUp | null = drilled && mode === "warm_up"
    ? (() => {
        const tech = lib.techniques.get(drilled.technique)!;
        const item = s.scoring!.items.find((i) => i.code === drilled.code)!;
        return { item: drilled.code, behavior: item.behavior, technique: { code: tech.code, name: tech.name, modelLine: tech.model_line_kind === "spoken" ? tech.model_line : null } };
      })()
    : null;
  const lang = await language();
  const scenario: RoomScenario = {
    code: s.code,
    title: s.title,
    setting: s.setting,
    level: s.difficulty,
    maxTurns: s.max_turns,
    languages: s.language_options,
    targets: s.target_techniques.map((c) => {
      const tech = lib.techniques.get(c)!;
      return { code: c, name: tech.name, grade: tech.evidence.grade };
    }),
    lesson: (() => {
      const l = lessonFor(s.code, lib);
      return l ? { title: l.title, hook: l.hook, tactic: l.tactic ?? null, steps: l.steps ?? [], what: l.what, why: l.why, when: l.when, when_not: l.when_not, say: l.say, mistakes: l.mistakes, concepts: l.concepts.map((c) => ({ name: c.name, idea: c.idea })) } : null;
    })(),
    demos: {
      flawed: { notice: s.demonstrations.flawed.notice, script: s.demonstrations.flawed.script },
      good: { notice: s.demonstrations.good.notice, script: s.demonstrations.good.script },
    },
    sheet: s.numbers_sheet
      ? { allInCents: s.facts.all_in_price_cents, options: s.facts.payment_options.map((o) => ({ cents: o.cents, termMonths: o.term_months, downCents: o.down_cents })) }
      : null,
  };
  return <PracticeRoom scenario={scenario} uiLanguage={lang} live={aiConfigured()} mode={mode} warmUp={warmUp} />;
}
