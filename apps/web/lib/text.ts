/**
 * AI-written text that holds a placeholder instead of the words, like "Su respuesta final: …" (a verification pass,
 * October 5): the placeholder is cut, and a line that was only a placeholder is not shown at all. A real trailing
 * ellipsis ("Aparte del pago…") stays: only a label followed by nothing but dots is a placeholder.
 */
export function real(s: string | null | undefined): string | null {
  if (!s) return null;
  const cut = s.replace(/\s*[^.!?¿¡:]*:\s*["“'‘]?(?:…|\.{3})["”'’]?\s*$/u, "").trim();
  return cut.replace(/["“”'‘’\s.…]/gu, "") ? cut : null;
}
