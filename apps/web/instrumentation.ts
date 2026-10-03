/**
 * Runs once when the server starts. Loads the content library, compiles the rule engine with one offline turn per
 * language, and opens database connections up front, so the first reps after a deploy do not wait for any of it (load test, M7: a cold first burst of 25 reps
 * had a 1.3 s tail; with the pool warmed, see STATUS for the measured numbers).
 */
export async function register() {
  // The condition must wrap the import itself: Next replaces NEXT_RUNTIME at build time and drops the branch from
  // the edge bundle. An early return does not, and the dev server then fails to bundle the database driver.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmUp } = await import("./instrumentation-node");
    await warmUp();
  }
}

/** Every server error, as one structured line (decision 0021): the route and the error, never the request body. */
export async function onRequestError(error: unknown, request: { path: string; method: string }, context: { routePath: string; routeType: string }) {
  const { log, errorField } = await import("./lib/log");
  log("error", "request_failed", { method: request.method, route: context.routePath, kind: context.routeType, error: errorField(error), digest: (error as { digest?: string })?.digest });
}
