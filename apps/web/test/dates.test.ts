import { describe, expect, it } from "vitest";
import { dateFormat, spanishDate } from "../lib/dates";

describe("dates in the style guide's Spanish (docs/spanish-style-guide.md section 2)", () => {
  it("writes p. m. and abbreviated months with a period", () => {
    expect(spanishDate("5 oct 2026, 7:19 p.m.")).toBe("5 oct. 2026, 7:19 p. m.");
    expect(spanishDate("lun, 7 de sept")).toBe("lun, 7 de sept.");
    expect(spanishDate("7 may 2026")).toBe("7 may. 2026");
    expect(spanishDate("lunes, 5 de octubre")).toBe("lunes, 5 de octubre");
    expect(spanishDate("5 oct. 2026")).toBe("5 oct. 2026");
  });
  it("leaves English alone", () => {
    const d = new Date("2026-10-05T23:19:00Z");
    // ICU versions differ on the space before PM (U+202F or a plain space).
    const plain = (x: string) => x.replace(/\s/g, " ");
    expect(plain(dateFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(d))).toBe("7:19 PM");
    expect(plain(dateFormat("es", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(d))).toBe("7:19 p. m.");
  });
});
