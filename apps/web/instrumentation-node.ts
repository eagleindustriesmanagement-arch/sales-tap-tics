/** Node-only warm-up, loaded by instrumentation.ts (kept apart so the edge build never sees the database driver). */
export async function warmUp() {
  const { platformLibrary } = await import("@taptics/content");
  const library = platformLibrary();
  // One offline turn per language compiles the rule engine's patterns and warms the session code paths.
  const { PracticeSession } = await import("@taptics/session");
  const scenario = [...library.scenarios.values()][0];
  if (scenario) {
    for (const [language, text] of [["en", "What would you want to be sure about before you decide? It's $33,349 all in."], ["es", "¿Qué le gustaría tener claro antes de decidir? Son $33,349 con todo."]] as const) {
      const s = new PracticeSession({ library, scenarioCode: scenario.code, language, seed: "warm-up", exitDraw: 0.99, tenantId: "warm-up", sessionId: "warm-up", textMode: true });
      s.start();
      const turn = s.repTurn(text);
      for (let step = await turn.next(); !step.done; step = await turn.next());
      await s.finish();
    }
  }
  if (process.env.DATABASE_URL) {
    const { pool } = await import("./lib/db");
    const clients = await Promise.all(Array.from({ length: Number(process.env.TAPTICS_DB_WARM ?? (process.env.VERCEL ? 2 : 10)) }, () => pool().connect().catch(() => null)));
    for (const c of clients) c?.release();
  }
}
