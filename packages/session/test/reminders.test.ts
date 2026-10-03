import { describe, expect, it } from "vitest";
import { reminderDue, storeClock } from "../src/index.js";

const base = { chosen: "18:30", weekday: 2, sentToday: false, practicedToday: false };

describe("reminder delivery (spec 15.3 item 5)", () => {
  it("sends on the first hourly run at or after the chosen time, once", () => {
    expect(reminderDue({ ...base, nowLocal: "18:00" })).toBe(false);
    expect(reminderDue({ ...base, nowLocal: "19:00" })).toBe(true);
    // The next run is past the window: nothing more today, even if the 19:00 run failed.
    expect(reminderDue({ ...base, nowLocal: "20:00" })).toBe(false);
    expect(reminderDue({ ...base, nowLocal: "19:00", sentToday: true })).toBe(false);
  });

  it("skips a rep who already practiced today", () => {
    expect(reminderDue({ ...base, nowLocal: "19:00", practicedToday: true })).toBe(false);
  });

  it("never sends in the store's peak hours: Saturday 11 to 5 by default", () => {
    const saturday = { ...base, chosen: "12:00", weekday: 6 };
    expect(reminderDue({ ...saturday, nowLocal: "13:00" })).toBe(false);
    expect(reminderDue({ ...saturday, nowLocal: "17:00" })).toBe(true);
    // A store's own peaks replace the default.
    expect(reminderDue({ ...saturday, nowLocal: "13:00", peaks: [] })).toBe(false);
    expect(reminderDue({ ...saturday, nowLocal: "12:00", peaks: [] })).toBe(true);
  });
});

describe("the store's clock", () => {
  it("is Miami time, across midnight UTC and daylight saving", () => {
    // 2026-10-04 23:30 UTC is Sunday 19:30 in Miami (EDT).
    expect(storeClock(new Date("2026-10-04T23:30:00Z"))).toEqual({ day: "2026-10-04", weekday: 0, time: "19:30" });
    // 2026-12-05 16:00 UTC is Saturday 11:00 (EST).
    expect(storeClock(new Date("2026-12-05T16:00:00Z"))).toEqual({ day: "2026-12-05", weekday: 6, time: "11:00" });
    expect(storeClock(new Date("2026-10-05T04:05:00Z")).time).toBe("00:05");
  });
});
