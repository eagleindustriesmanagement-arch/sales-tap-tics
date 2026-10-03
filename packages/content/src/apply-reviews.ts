import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isScalar, parseDocument } from "yaml";

/** The file a scenario is authored in: scenarios live in one folder per industry (`scenarios/car`, `scenarios/solar`). */
export function scenarioFile(libraryDir: string, code: string): string {
  const root = join(libraryDir, "scenarios");
  for (const folder of readdirSync(root)) {
    const file = join(root, folder, `${code}.yaml`);
    if (existsSync(file)) return file;
  }
  throw new Error(`no file for scenario ${code}`);
}

/**
 * Writes reviewed Spanish into a content file (decision 0010). Only the edited values change: each is replaced in
 * place at its source position, so the rest of the file stays byte for byte as authored. Marks the file
 * `spanish_reviewed: true` only when told every line in it is approved.
 */
export function applyToYaml(text: string, edits: { path: (string | number)[]; value: string }[], allApproved: boolean): string {
  const doc = parseDocument(text);
  const spans = edits.map((e) => {
    const node = doc.getIn(e.path, true);
    if (!isScalar(node) || !node.range) throw new Error(`no such text field: ${e.path.join(".")}`);
    // A double-quoted YAML scalar accepts JSON string escapes.
    return { start: node.range[0], end: node.range[1], value: JSON.stringify(e.value) };
  });
  let out = text;
  for (const s of spans.sort((a, b) => b.start - a.start)) out = out.slice(0, s.start) + s.value + out.slice(s.end);
  if (allApproved) {
    out = /^spanish_reviewed:.*$/m.test(out) ? out.replace(/^spanish_reviewed:.*$/m, "spanish_reviewed: true") : `${out.trimEnd()}\nspanish_reviewed: true\n`;
  }
  return out;
}
