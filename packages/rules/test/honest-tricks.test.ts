import { describe, expect, it } from "vitest";
import { checkUtterance } from "../src/index.js";
import { ctx } from "./fixtures.js";
/**
 * Sales is a game of tricks (decision 0034): assumptive and alternative closes, trial closes, social proof, takeaways,
 * flattery, future pacing, "let me ask my manager" with no fake limit. None of them states a false fact, so none is
 * flagged, in English or in Spanish. A rule that starts catching one of these is a rule that punishes selling.
 */
const en = [
  "So, should we put it in your name or your wife's?",
  "Would Tuesday at six or Saturday morning work better for you?",
  "If the numbers work, is this the car you want?",
  "Honestly, this color is one of our most popular.",
  "A lot of families in Doral drive this exact model.",
  "Let me go see what my manager can do for you.",
  "I'll ask my manager, but I can't promise anything.",
  "Maybe this isn't the right car for you, and that's okay.",
  "You look great behind the wheel.",
  "Let's get the paperwork started while they wash it.",
  "Picture your kids in the third row on the way to the beach.",
  "I wouldn't sell this to you if I didn't believe in it.",
  "What would it take to earn your business today?",
  "If I could get you a better trade number, would you buy today?",
  "Most people in your situation go with the LT.",
  "You're going to love how quiet it is on the highway.",
  "Let me show you why people pay a little more for this one.",
  "Take it home for the weekend and see how it fits your life.",
  "I can tell you're a smart shopper.",
  "Between you and me, this is the one I'd buy.",
  "The sooner we start, the sooner you're driving it home.",
  "Let me make you a deal you can't turn down.",
];
const es = [
  "¿Lo ponemos a su nombre o al de su esposa?",
  "¿Le queda mejor el martes a las seis o el sábado en la mañana?",
  "Si los números funcionan, ¿este es el carro que quiere?",
  "Este color es de los más populares que tenemos.",
  "Muchas familias en Doral manejan este mismo modelo.",
  "Déjeme ver qué puede hacer mi gerente por usted.",
  "Le pregunto a mi gerente, pero no le prometo nada.",
  "A lo mejor este no es el carro para usted, y no pasa nada.",
  "Se ve muy bien manejándolo.",
  "Vamos adelantando los papeles mientras lo lavan.",
  "Imagínese a los niños en la tercera fila camino a la playa.",
  "Entre usted y yo, este es el que yo compraría.",
  "¿Qué tendría que pasar para que me compre hoy?",
  "Si le consigo más por su trade-in, ¿compra hoy?",
  "Llévelo el fin de semana y vea cómo le queda.",
  "Mientras más rápido empecemos, más rápido se lo lleva.",
];
describe("honest persuasion is never flagged", () => {
  for (const [lang, lines] of [["en", en], ["es", es]] as const)
    for (const text of lines)
      it(`${lang}: ${text}`, () => {
        const v = checkUtterance({ text, language: lang, speaker: "rep" }, ctx({ language: lang }));
        expect(v.map((x) => `${x.rule}: ${x.span.text}`)).toEqual([]);
      });
});
