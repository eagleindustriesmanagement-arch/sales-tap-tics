"use client";

import type { Language } from "@taptics/i18n";
import { Debrief, type DebriefPayload } from "@/components/debrief";

export function DebriefView({ data, language, scenarioCode, seenId }: { data: DebriefPayload; language: Language; scenarioCode: string; seenId?: string }) {
  return <Debrief data={data} language={language} standalone={false} seenId={seenId} onRetry={() => location.assign(`/practice/${scenarioCode}`)} />;
}
