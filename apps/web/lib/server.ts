import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { AiClient, ClaudeComplianceClassifier, ClaudeJudge, ClaudeUnlockDetector } from "@taptics/ai";
import { platformLibrary } from "@taptics/content";
import { exitDrawFor } from "@taptics/engine";
import { isLanguage, type Language } from "@taptics/i18n";
import { PracticeSession, type SessionResult } from "@taptics/session";

export const library = () => platformLibrary();

export async function language(): Promise<Language> {
  const value = (await cookies()).get("lang")?.value;
  return isLanguage(value) ? value : "en";
}

/** The live Claude customer only when a key is configured; otherwise the offline customer (labeled in the UI). */
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.TAPTICS_OFFLINE !== "1";
}

// Pilot stand-ins until authentication and the database are wired (STATUS.md): one demo tenant and rep.
export const DEMO_TENANT = "demo-tenant";
const DEMO_REP_SECRET = process.env.TAPTICS_DEMO_REP_SECRET ?? "demo-rep";

interface Live {
  session: PracticeSession;
  createdAt: number;
  result: SessionResult | null;
}

// In-memory session store for the single-process pilot build; sessions expire after an hour.
const store = globalThis as unknown as { __taptics?: { sessions: Map<string, Live>; attempts: Map<string, number>; floorChecks: unknown[] } };
store.__taptics ??= { sessions: new Map(), attempts: new Map(), floorChecks: [] };
export const memory = store.__taptics;

function sweep() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, live] of memory.sessions) if (live.createdAt < cutoff) memory.sessions.delete(id);
}

export function createSession(scenarioCode: string, lang: Language | "follow") {
  sweep();
  const id = randomUUID();
  const attempt = memory.attempts.get(scenarioCode) ?? 0;
  memory.attempts.set(scenarioCode, attempt + 1);
  let ai: ConstructorParameters<typeof PracticeSession>[0]["ai"];
  if (aiConfigured()) {
    const client = new AiClient();
    const lib = library();
    ai = {
      client,
      classifier: new ClaudeComplianceClassifier(client, DEMO_TENANT, id),
      detector: new ClaudeUnlockDetector(client, DEMO_TENANT, id),
      judge: new ClaudeJudge(client, DEMO_TENANT, { lexicon: lib.lexicon!, rules: [...lib.rules.values()] }, id),
    };
  }
  const session = new PracticeSession({
    library: library(),
    scenarioCode,
    language: lang,
    seed: `${DEMO_REP_SECRET}:${scenarioCode}:${attempt}`,
    exitDraw: exitDrawFor(DEMO_REP_SECRET, scenarioCode, attempt),
    tenantId: DEMO_TENANT,
    sessionId: id,
    textMode: true,
    // The pilot runs stop-on-critical for the first two weeks of onboarding (spec 12.2 item 5).
    stopOnCritical: process.env.TAPTICS_STOP_ON_CRITICAL !== "0",
    ai,
  });
  memory.sessions.set(id, { session, createdAt: Date.now(), result: null });
  return { id, session };
}

export function getSession(id: string): Live | undefined {
  return memory.sessions.get(id);
}
