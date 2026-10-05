import { describe, expect, it } from "vitest";
import { platformLibrary } from "../src/index.js";

/**
 * Decision 0034: a `kind: coaching` automatic-fail condition costs nothing, so it must describe a move that deceives
 * no one. A description that names a lie, a made-up fact or an unkeepable promise belongs in an honesty condition,
 * which zeroes the attempt. A coaching description that uses these words routes a lie to "no points lost".
 */

/** A whole-word, case-insensitive pattern; the boundaries count accented letters (JavaScript's \b does not). */
const word = (source: string) => new RegExp(`(?<!\\p{L})(?:${source})(?!\\p{L})`, "iu");

const DISHONESTY: Record<"en" | "es", RegExp[]> = {
  en: [
    "untrue",
    "(?:is ?n['’]?t|not) true",
    "false(?:ly)?",
    "made[- ]up",
    "makes? up",
    "fake[sd]?",
    "invent(?:s|ed|ing)?",
    "wrong date",
    "can(?:['’]?t|not) back (?:it )?up",
    "promis(?:e|es|ed|ing)",
    "li(?:e|es|ed)",
    "lying",
    // "Made the date sound tighter than it is": a misstatement, whatever the date.
    "than (?:it|they) (?:really )?(?:is|are)",
  ].map(word),
  es: [
    "fals[oa]s?",
    "invent(?:ad[oa]s?|ó|a|an|ar)",
    "no es verdad",
    "no es cierto",
    "ment(?:ir|ira|iras|ía)",
    "mint(?:ió|ieron)",
    "promet(?:er|ió|e|en|ido)",
    "promesas?",
    "no puede (?:cumplir|respaldar|probar)",
    "de lo que (?:realmente )?(?:es|son)",
  ].map(word),
};

/** The words of dishonesty found in a text, for one language. */
function dishonestyWords(text: string, lang: "en" | "es"): string[] {
  return DISHONESTY[lang].flatMap((re) => text.match(re)?.[0] ?? []);
}

describe("coaching conditions describe no dishonesty (decision 0034)", () => {
  it("the word list catches the shapes it is meant to catch", () => {
    expect(dishonestyWords("Dodged the price with an excuse that isn't true", "en")).toEqual(["isn't true"]);
    expect(dishonestyWords("Made the move date sound tighter (made-up delivery times)", "en")).toEqual(["made-up"]);
    expect(dishonestyWords("Said things about the other dealer that the rep can't back up", "en")).toEqual(["can't back up"]);
    expect(dishonestyWords("Promised how the car feels on the highway", "en")).toEqual(["Promised"]);
    expect(dishonestyWords("Esquivó el precio con una excusa que no es verdad", "es")).toEqual(["no es verdad"]);
    expect(dishonestyWords("tiempos de entrega inventados", "es")).toEqual(["inventados"]);
    expect(dishonestyWords("Made her move-out date sound tighter than it is", "en")).toEqual(["than it is"]);
    expect(dishonestyWords("Inventó una fecha límite", "es")).toEqual(["Inventó"]);
    expect(dishonestyWords("Hizo ver su fecha de salida más apretada de lo que es", "es")).toEqual(["de lo que es"]);
    expect(dishonestyWords("Le prometió que no se iba a arrepentir", "es")).toEqual(["prometió"]);
    expect(dishonestyWords("una promesa que la tienda no puede cumplir", "es")).toEqual(["promesa", "no puede cumplir"]);
    // Clean coaching notes stay clean, and "applied" is not "lied".
    expect(dishonestyWords("Ran down the other dealer; applied pressure", "en")).toEqual([]);
    expect(dishonestyWords("Le restó importancia a consultar con la pareja", "es")).toEqual([]);
  });

  it("no kind: coaching auto-fail description, in English or Spanish, names a lie", () => {
    const library = platformLibrary();
    const offenders: string[] = [];
    let coaching = 0;
    for (const s of library.scenarios.values()) {
      for (const a of s.scoring?.auto_fail ?? []) {
        if (a.kind !== "coaching") continue;
        coaching += 1;
        for (const lang of ["en", "es"] as const) {
          const words = dishonestyWords(a.description[lang], lang);
          if (words.length > 0) offenders.push(`${s.code} ${a.code} (${lang}): ${words.join(", ")} in "${a.description[lang]}"`);
        }
      }
    }
    expect(coaching).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
