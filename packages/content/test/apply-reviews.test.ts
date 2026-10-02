import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { applyToYaml, lineStatus, platformLibrary, reviewLines, yamlPath } from "../src/index.js";

const library = platformLibrary();
const file = join(import.meta.dirname, "../library/scenarios/car/S-partner-check-L1.yaml");

describe("Spanish review write-back (decision 0010)", () => {
  const lines = reviewLines(library, "S-partner-check-L1");
  it("every review line of every scenario maps to its field, in the scenario and the persona", () => {
    let checked = 0;
    for (const s of library.scenarios.values()) {
      const scenario = parse(readFileSync(join(import.meta.dirname, `../library/scenarios/car/${s.code}.yaml`), "utf8"));
      const persona = parse(readFileSync(join(import.meta.dirname, `../library/personas/${s.persona}.yaml`), "utf8"));
      for (const l of reviewLines(library, s.code)) {
        const doc = l.kind === "scenario" ? scenario : persona;
        const value = yamlPath(library, l).reduce((node: any, k) => node?.[k], doc);
        expect(value, `${s.code} ${l.key}`).toBe(l.es);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(800);
  });
  it("writes an edit, keeps comments, and marks the file reviewed only when told", () => {
    const text = readFileSync(file, "utf8");
    const line = lines.find((l) => l.key === "demo.good.6")!;
    const out = applyToYaml(text, [{ path: yamlPath(library, line), value: "La verdad, son como sesenta dólares más de lo que le dije." }], false);
    expect(parse(out).demonstrations.good.script.es[6].text).toBe("La verdad, son como sesenta dólares más de lo que le dije.");
    expect(parse(out).spanish_reviewed).toBe(false);
    expect(out).toContain("# Spec 10.5.");
    expect(parse(applyToYaml(text, [], true)).spanish_reviewed).toBe(true);
  });
  it("a review goes stale when the English or Spanish changes under it", () => {
    const l = lines[0]!;
    const review = { enText: l.en, esOriginal: l.es, esFinal: l.es, needsCompliance: false, complianceBy: null };
    expect(lineStatus(l, review)).toBe("approved");
    expect(lineStatus({ ...l, en: "changed" }, review)).toBe("stale");
    expect(lineStatus(l, { ...review, needsCompliance: true })).toBe("needs_compliance");
  });
});
