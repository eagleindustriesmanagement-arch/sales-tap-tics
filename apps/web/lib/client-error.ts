/**
 * Reports a browser-side crash to the server log (decision 0027), so a failure no one can reproduce locally shows
 * its real cause. Codes and the error's own text only: never the conversation, a name or anything typed.
 */
let reported = 0;

export function reportClientError(area: string, error: unknown, digest?: string) {
  if (typeof window === "undefined" || reported >= 5) return;
  reported += 1;
  const e = error instanceof Error ? error : new Error(String(error));
  const frame = e.stack?.split("\n").map((s) => s.trim()).find((s) => s.startsWith("at ") || s.includes("@"));
  const ua = navigator.userAgent;
  const body = JSON.stringify({
    area,
    name: e.name,
    message: e.message,
    frame,
    digest,
    path: location.pathname,
    browser: /Edg\//.test(ua) ? "edge" : /CriOS|Chrome\//.test(ua) ? "chrome" : /FxiOS|Firefox\//.test(ua) ? "firefox" : /Safari\//.test(ua) ? "safari" : "other",
    mobile: /Mobi|iPhone|Android/.test(ua),
    // Chrome marks a page it has machine-translated; translation rewrites the page under React.
    translated: /translated-(ltr|rtl)/.test(document.documentElement.className),
  });
  try {
    void fetch("/api/client-error", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* reporting must never fail the page */
  }
}
