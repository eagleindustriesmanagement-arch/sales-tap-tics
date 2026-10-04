import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Every word a person reads goes through the translations (docs/spanish-style-guide.md section 6 rule 7): text
// written straight into a screen shows in English to a Spanish speaker, and screen readers read English labels aloud.
// This finds literal text between tags and literal aria-label, placeholder, title and alt values.
const root = join(import.meta.dirname, "..");
// The brand; language names, always written in their own language; and the millisecond unit.
const BRAND = new Set(["Sales Taptics", "Taptics", "English", "Español", "ms"]);
/** Text inside an aria-hidden element is decoration nobody reads aloud (the home page's "¿y el down?"). */
const hidden = (n: ts.Node): boolean => {
  for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
    const attrs = ts.isJsxElement(p) ? p.openingElement.attributes : ts.isJsxSelfClosingElement(p) ? p.attributes : null;
    if (attrs?.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === "aria-hidden" && (!a.initializer || /true/.test(a.initializer.getText())))) return true;
  }
  return false;
};
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith(".tsx") ? [path] : [];
  });
}
function hardcoded(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const at = (n: ts.Node) => `${relative(root, file)}:${source.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      const text = n.getText().replace(/\s+/g, " ").trim();
      if (/[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}/.test(text) && !BRAND.has(text) && !hidden(n)) found.push(`${at(n)} text "${text}"`);
    }
    if (ts.isJsxAttribute(n) && ["aria-label", "placeholder", "title", "alt"].includes(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer)) {
      const text = n.initializer.text;
      if (/[A-Za-z]{2,}/.test(text) && !BRAND.has(text)) found.push(`${at(n)} ${n.name.getText()}="${text}"`);
    }
    ts.forEachChild(n, visit);
  };
  visit(source);
  return found;
}

describe("no words written straight into a screen", () => {
  it("every visible word and every label goes through the translations", () => {
    const offenders = ["app", "components"].flatMap((d) => files(join(root, d))).flatMap(hardcoded);
    expect(offenders).toEqual([]);
  });
});
