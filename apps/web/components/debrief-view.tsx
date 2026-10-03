"use client";

import type { Language } from "@taptics/i18n";
import { Debrief, type DebriefPayload } from "@/components/debrief";

export function DebriefView({ data, language, scenarioCode }: { data: DebriefPayload; language: Language; scenarioCode: string }) {
  return <Debrief data={data} language={language} standalone={false} onRetry={() => location.assign(`/practice/${scenarioCode}`)} />;
}
