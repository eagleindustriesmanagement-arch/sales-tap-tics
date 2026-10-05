import { describe, expect, it } from "vitest";
import { platformLibrary } from "@taptics/content";
import { assignGroups, type AssignScenario } from "../lib/assign-options";

const lib = platformLibrary();
const scenarios = (lang: "en" | "es"): AssignScenario[] =>
  [...lib.scenarios.values()].filter((s) => s.status === "active").map((s) => ({ code: s.code, industry: s.industry, level: s.difficulty, title: s.title[lang] }));

describe("Assign: the scenario list (wrong-industry assignments, October 5 verification)", () => {
  for (const lang of ["en", "es"] as const) {
    it(`puts the team's own industry first, names the others, and every label is unique (${lang})`, () => {
      const all = scenarios(lang);
      for (const team of ["cars", "homes", "solar", "furniture"]) {
        const groups = assignGroups(all, team, lang);
        expect(groups[0]!.industry).toBe(team);
        expect(groups[0]!.own).toBe(true);
        expect(groups.slice(1).every((g) => !g.own)).toBe(true);
        // Every active scenario is still offered, exactly once.
        const codes = groups.flatMap((g) => g.options.map((o) => o.code));
        expect(codes.sort()).toEqual(all.map((s) => s.code).sort());
        const labels = groups.flatMap((g) => g.options.map((o) => o.label));
        expect(new Set(labels).size).toBe(labels.length);
        // Outside the team's own group, each option names its industry, the same name the Practice page uses.
        for (const g of groups.slice(1)) for (const o of g.options) expect(o.label.startsWith(`${g.label} · `)).toBe(true);
        expect(new Set(groups.map((g) => g.label)).size).toBe(groups.length);
      }
    });
  }

  it("a team in another line of work starts on the car customers", () => {
    expect(assignGroups(scenarios("en"), "other", "en")[0]!.industry).toBe("cars");
  });

  it("names the level on every option, in Spanish too", () => {
    const groups = assignGroups(scenarios("es"), "solar", "es");
    expect(groups[0]!.label).toBe("Solar · su equipo");
    expect(groups.find((g) => g.industry === "cars")!.options[0]!.label).toMatch(/^Carros · Nivel \d · /);
  });

  it("keeps two look-alike labels apart by code", () => {
    const groups = assignGroups([{ code: "A", industry: "cars", level: 1, title: "Same" }, { code: "B", industry: "cars", level: 1, title: "Same" }], "cars", "en");
    expect(groups[0]!.options.map((o) => o.label)).toEqual(["Level 1 · Same", "Level 1 · Same (B)"]);
  });
});
