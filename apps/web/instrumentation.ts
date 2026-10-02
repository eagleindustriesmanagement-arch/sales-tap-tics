/**
 * Runs once when the server starts. Loads the content library, compiles the rule engine with one offline turn per
 * language, and opens database connections up front, so the first reps after a deploy do not wait for any of it (load test, M7: a cold first burst of 25 reps
 * had a 1.3 s tail; with the pool warmed, see STATUS for the measured numbers).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
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
    const clients = await Promise.all(Array.from({ length: Number(process.env.TAPTICS_DB_WARM ?? 10) }, () => pool().connect().catch(() => null)));
    for (const c of clients) c?.release();
  }
}
