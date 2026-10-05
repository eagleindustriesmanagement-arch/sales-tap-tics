/**
 * AI-written text that holds a placeholder instead of the words, like "Su respuesta final: …" (a verification pass,
 * October 5): the placeholder is cut, and a line that was only a placeholder is not shown at all. Only a known
 * placeholder label is cut ("Your final answer", "Su respuesta final", "quote", "cita"...), so a rep who really
 * trailed off after a colon ("Mire, le voy a ser honesto: …") keeps their words, and so does a real trailing
 * ellipsis ("Aparte del pago…").
 */
const ELLIPSIS = String.raw`(?:…|\.{3,}|(?:\.\s){2}\.)`;
const OPEN = String.raw`["“'‘«(\[<]?`;
const CLOSE = String.raw`["”'’»)\]>]?`;
const LABEL = String.raw`(?:(?:your|the|his|her|their|su|la|el)\s+)?(?:(?:final|last|best)\s+(?:answer|response|reply|line|words?|quote)|(?:rep(?:'s)?|customer(?:'s)?|salesperson(?:'s)?)\s+(?:line|quote|words?)|quote|respuesta\s+final|(?:[uú]ltima|mejor)\s+(?:respuesta|frase|l[ií]nea)|frase\s+(?:final|del\s+(?:vendedor|cliente))|cita)`;
const TRAILING_LABEL = new RegExp(String.raw`(?:^|\s+)${LABEL}\s*[:\-–—]\s*(?:${OPEN}\s*${ELLIPSIS}?\s*${CLOSE})?\s*$`, "iu");
const ONLY_PLACEHOLDER = new RegExp(String.raw`^\s*(?:${OPEN}\s*${ELLIPSIS}?\s*${CLOSE}|\[[^\]]*\]|<[^>]*>)\s*$`, "u");

export function real(s: string | null | undefined): string | null {
  if (!s) return null;
  const cut = s.replace(TRAILING_LABEL, "").trim();
  if (!cut || ONLY_PLACEHOLDER.test(cut) || !cut.replace(/["“”'‘’«»()\[\]<>\s.…]/gu, "")) return null;
  return cut;
}
