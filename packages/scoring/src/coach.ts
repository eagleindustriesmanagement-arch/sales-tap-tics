import type { BehaviorCard, BilingualText, Library } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { findClockTimes } from "@taptics/rules";

/**
 * Coach the coach (spec 14.3): the manager practices a floor check on a simulated rep and is scored on the
 * four-part shape (spec 14.1 item 3): what I saw, the one behavior, the exact line, when we check again.
 */
export type CoachPart = "saw" | "behavior" | "line" | "check_again";
export const COACH_PARTS: CoachPart[] = ["saw", "behavior", "line", "check_again"];

export interface CoachScene {
  cardCode: string;
  repName: string;
  /** What the manager watched, in the manager's language. */
  scene: BilingualText;
}

export interface CoachResult {
  parts: Record<CoachPart, boolean>;
  /** More than one behavior at once dilutes the check (Dahling and others 2016: weak coaching hurts). */
  oneBehavior: boolean;
  score: number;
  /** The card's model wording for every part the manager left out. */
  missing: { part: CoachPart; model: string }[];
}

const SAW: Record<Language, RegExp> = {
  en: /\b(I (saw|watched|noticed|heard|caught|was watching)|when (they|he|she|the customer|the couple) (said|asked|told you)|you (said|went|answered|jumped|told them))\b/i,
  es: /\b(l[oa] vi|vi (su|que|cuando|como)|me fij[ée]|escuch[ée]|estaba mirando|cuando (le )?(dijeron|dijo|preguntaron|preguntó)|usted (dijo|fue|contestó|respondió|saltó))\b/iu,
};
const BEHAVIOR: Record<Language, RegExp> = {
  en: /\b(next time|instead|from now on|what I want you to (do|try)|the one thing|try (to|this))\b/i,
  es: /\b(la próxima vez|en vez de|en lugar de|de ahora en adelante|lo que quiero (es )?que (haga|pruebe)|lo único|pruebe (a|esto))\b/iu,
};
const SAY: Record<Language, RegExp> = {
  en: /\b(say|ask|try saying|like this|tell them)\s*[:,]?\s*["“'‘]/i,
  es: /\b(diga|dígale|pregunte|pregúntele|así|algo como)\s*[:,]?\s*["“'‘«]/iu,
};
const QUOTED = /["“«]([^"”»]{12,})["”»]|['‘]([^'’]{12,})['’]/u;
const WHEN: Record<Language, RegExp> = {
  en: /\b(next (up|customer|one)|after lunch|this (afternoon|morning|evening)|today|tonight|tomorrow|before (you leave|close)|on your next|I'?ll (check|watch|come back|look)|let'?s (try|check))\b/i,
  es: /\b(próximo cliente|siguiente cliente|después del almuerzo|esta (tarde|mañana|noche)|hoy|mañana|antes de (irse|cerrar)|lo voy a (estar )?(mirar|mirando|chequear)|le pregunto|vamos a (probar|ver))\b/iu,
};
const MORE: Record<Language, RegExp> = {
  en: /\b(also|another thing|and one more|on top of that|plus,? (you|work on))\b/i,
  es: /\b(también|otra cosa|además|y otra más)\b/iu,
};

export function scoreFloorCheck(text: string, language: Language, card: BehaviorCard): CoachResult {
  const quoted = QUOTED.test(text) || SAY[language].test(text);
  const parts: Record<CoachPart, boolean> = {
    saw: SAW[language].test(text),
    behavior: BEHAVIOR[language].test(text),
    line: quoted,
    check_again: WHEN[language].test(text) || findClockTimes(text).length > 0,
  };
  const oneBehavior = !MORE[language].test(text);
  const present = COACH_PARTS.filter((p) => parts[p]).length;
  const score = present * 25 - (oneBehavior ? 0 : 10);
  return {
    parts,
    oneBehavior,
    score: Math.max(0, score),
    missing: COACH_PARTS.filter((p) => !parts[p]).map((part) => ({ part, model: card.floor_check_script[part][language] })),
  };
}

const REPS = ["Ana", "Luis", "Yesenia", "Carlos", "Daniel", "Marisol"];
const OBJECTION_FOR: Record<string, string> = {
  T001: "O03", T002: "O03", T003: "O01", T005: "O05", T013: "O01", T014: "O07",
};

/** A short scene for one card: the rep's flawed habit in front of a customer, as the manager saw it. */
export function coachScene(library: Library, card: BehaviorCard, seed: number): CoachScene {
  const repName = REPS[seed % REPS.length]!;
  const technique = library.techniques.get(card.technique);
  const objection = library.objections.get(OBJECTION_FOR[card.technique] ?? "O03");
  const flawed = technique?.flawed_line;
  const said = objection?.says ?? { en: "the payment is too high", es: "el pago está muy alto" };
  const scene = flawed
    ? {
        en: `You watched ${repName} with a couple at the Equinox. When they said "${said.en}", ${repName} answered: "${flawed.en}"`,
        es: `Usted vio a ${repName} con una pareja en la Equinox. Cuando dijeron "${said.es}", ${repName} contestó: "${flawed.es}"`,
      }
    : {
        en: `You watched ${repName} with a couple at the Equinox. ${card.floor_check_script.saw.en.replace(/\[[^\]]*\]/g, "the customer")}`,
        es: `Usted vio a ${repName} con una pareja en la Equinox. ${card.floor_check_script.saw.es.replace(/\[[^\]]*\]/g, "el cliente")}`,
      };
  return { cardCode: card.code, repName, scene };
}
