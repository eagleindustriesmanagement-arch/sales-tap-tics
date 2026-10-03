import { describe, expect, it } from "vitest";
import { errorField, logLine } from "../lib/log";

describe("structured logs (decision 0021)", () => {
  it("writes one JSON line with codes and numbers", () => {
    const line = JSON.parse(logLine("info", "turn", { session: "abc", totalMs: 412, live: false, skipped: undefined }));
    expect(line).toMatchObject({ level: "info", event: "turn", session: "abc", totalMs: 412, live: false });
    expect("skipped" in line).toBe(false);
  });

  it("drops anything that looks like an email or a phone number, and odd keys", () => {
    const line = JSON.parse(logLine("error", "x", { error: "no user rep@demo.test", phone: "+1 (305) 555-0100", "bad key": "v", level: "info" }));
    expect(line.error).toBe("[redacted]");
    expect(line.phone).toBe("[redacted]");
    expect("bad key" in line).toBe(false);
    // Reserved fields cannot be overwritten.
    expect(line.level).toBe("error");
  });

  it("keeps an error to its class and message", () => {
    expect(errorField(new TypeError("boom"))).toBe("TypeError: boom");
    expect(errorField("x")).toBe("unknown");
  });
});
