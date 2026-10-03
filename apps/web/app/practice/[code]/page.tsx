import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { aiConfigured, language, library } from "@/lib/server";
import { PracticeRoom, type RoomScenario } from "@/components/practice-room";

export default async function Practice({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ mode?: string }> }) {
  await requireUser();
  const { code } = await params;
  const mode = (await searchParams).mode === "certification" ? "certification" : "practice";
  const lib = library();
  const s = lib.scenarios.get(code);
  if (!s) notFound();
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
    demos: {
      flawed: { notice: s.demonstrations.flawed.notice, script: s.demonstrations.flawed.script },
      good: { notice: s.demonstrations.good.notice, script: s.demonstrations.good.script },
    },
  };
  return <PracticeRoom scenario={scenario} uiLanguage={lang} live={aiConfigured()} mode={mode} />;
}
