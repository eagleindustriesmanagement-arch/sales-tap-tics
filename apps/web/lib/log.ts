/**
 * Structured logs (decision 0021): one JSON line per event on stdout, which the host keeps and searches (Vercel's
 * runtime logs, or a log drain). Fields are numbers, codes and ids only; never a name, an email, a phone number or
 * anything a rep or customer said (spec 20.2, 19.4).
 */
export type LogField = string | number | boolean | null | undefined;

const SAFE_KEY = /^[a-z][a-zA-Z0-9]*$/;
/** Values that look like an email or a phone number are dropped, whatever field they arrive in. */
const PERSONAL = /@|\+?\d[\d\s().-]{8,}\d/;

export function logLine(level: "info" | "warn" | "error", event: string, fields: Record<string, LogField> = {}): string {
  const out: Record<string, LogField> = { t: new Date().toISOString(), level, event };
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || !SAFE_KEY.test(k) || k in out) continue;
    if (typeof v === "string") out[k] = PERSONAL.test(v) ? "[redacted]" : v.slice(0, 200);
    else out[k] = v;
  }
  return JSON.stringify(out);
}

export function log(level: "info" | "warn" | "error", event: string, fields: Record<string, LogField> = {}) {
  const line = logLine(level, event, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** An error as a log field: its class and message only, never a stack with request data in it. */
export const errorField = (e: unknown) => (e instanceof Error ? `${e.constructor.name}: ${e.message}` : "unknown");
