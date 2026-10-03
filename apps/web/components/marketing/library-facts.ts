import { platformLibrary, type Technique } from "@taptics/content";
import type { L } from "./copy";

/**
 * What the public pages say about the content, counted from the library at render time (server only), so the
 * numbers on the page are always the library's own. If the library cannot load, the pages still render with the
 * last known counts and no technique names.
 */
export interface TechniqueCard { code: string; name: L; when: L; family: string }
export interface LibraryFacts {
  techniques: number;
  lessons: number;
  /** Car-sales role-play customers: one per objection. */
  objections: number;
  /** Techniques graded A or B: law, regulator, meta-analysis, a peer-reviewed study or a large dataset. */
  researchBacked: number;
  families: { family: string; count: number }[];
  featured: TechniqueCard[];
  /** Names for the moving rail, two rows. */
  rail: [L[], L[]];
}

/** Six that work on any high-ticket floor, in the order a conversation meets them. */
const FEATURED = ["T001", "T005", "T004", "T030", "T091", "T014"];
/** The rail: more techniques that travel beyond the car floor. */
const RAIL_A = ["T002", "T032", "T069", "T024", "T025", "T060", "T090", "T038", "T100", "T045", "T057", "T113"];
const RAIL_B = ["T016", "T018", "T106", "T027", "T089", "T112", "T022", "T017", "T061", "T098", "T094", "T011", "T026", "T115"];

let memo: LibraryFacts | null = null;

export function libraryFacts(): LibraryFacts {
  if (memo) return memo;
  try {
    const lib = platformLibrary();
    const all = [...lib.techniques.values()];
    const byCode = (code: string): Technique | undefined => lib.techniques.get(code);
    const counts = new Map<string, number>();
    for (const t of all) counts.set(t.family, (counts.get(t.family) ?? 0) + 1);
    const names = (codes: string[]) => codes.map(byCode).filter((t): t is Technique => !!t).map((t) => t.name);
    memo = {
      techniques: all.length,
      lessons: lib.lessons.size,
      objections: lib.objections.size,
      researchBacked: all.filter((t) => t.evidence.grade === "A" || t.evidence.grade === "B").length,
      families: [...counts].map(([family, count]) => ({ family, count })).sort((a, b) => b.count - a.count),
      featured: FEATURED.map(byCode).filter((t): t is Technique => !!t).map((t) => ({ code: t.code, name: t.name, when: t.when, family: t.family })),
      rail: [names(RAIL_A), names(RAIL_B)],
    };
    return memo;
  } catch {
    return { techniques: 122, lessons: 20, objections: 65, researchBacked: 0, families: [], featured: [], rail: [[], []] };
  }
}
