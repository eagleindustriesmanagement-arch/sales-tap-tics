import { describe, expect, it } from "vitest";
import { crossReference, LESSON_WORDS, lessonWords, platformLibrary } from "../src/index.js";

const library = platformLibrary();

describe("lessons (decision 0031)", () => {
  it("every certification scenario opens with a lesson", () => {
    const certification = [...library.scenarios.values()].filter((s) => library.objections.get(s.objection)?.release_1);
    expect(certification).toHaveLength(20);
    const taught = new Set([...library.lessons.values()].map((l) => l.scenario));
    expect(certification.map((s) => s.code).filter((c) => !taught.has(c))).toEqual([]);
  });

  it("each lesson reads in 60 to 90 seconds, in both languages", () => {
    for (const l of library.lessons.values()) {
      for (const lang of ["en", "es"] as const) {
        const words = lessonWords(l, lang);
        expect(words, `${l.code} ${lang}`).toBeGreaterThanOrEqual(LESSON_WORDS[lang].min);
        expect(words, `${l.code} ${lang}`).toBeLessThanOrEqual(LESSON_WORDS[lang].max);
      }
    }
  });

  it("every behavior a scenario scores is taught by a named concept in its lesson", () => {
    const errors = crossReference(library).filter((f) => f.level === "error" && f.item.startsWith("L-"));
    expect(errors).toEqual([]);
    for (const l of library.lessons.values()) {
      const s = library.scenarios.get(l.scenario)!;
      const taught = new Set(l.concepts.flatMap((c) => c.items));
      expect((s.scoring?.items ?? []).map((i) => i.code).filter((c) => !taught.has(c)), l.code).toEqual([]);
    }
  });
});
