import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "../prompts");

export interface PromptTemplate {
  id: string;
  version: number;
  /** "customer@1": stored with every score and usage record (spec 5.3, 13.4 item 5). */
  ref: string;
  body: string;
}

const cache = new Map<string, PromptTemplate>();

/** Loads `prompts/<id>.v<version>.md`. Prompts are versioned files, never inline strings (spec 5.3). */
export function loadPrompt(id: string, version = 1): PromptTemplate {
  const key = `${id}@${version}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = readFileSync(join(DIR, `${id}.v${version}.md`), "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`prompt ${key} has no front matter`);
  const meta = Object.fromEntries(match[1]!.split("\n").map((l) => l.split(":").map((x) => x.trim()) as [string, string]));
  if (meta["id"] !== id || Number(meta["version"]) !== version) throw new Error(`prompt ${key} front matter does not match its file name`);
  const template = { id, version, ref: key, body: match[2]!.trim() };
  cache.set(key, template);
  return template;
}

/** Fills {{name}} slots. A slot left unfilled is a bug, so it throws. */
export function render(template: PromptTemplate, values: Record<string, string>): string {
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    if (!(name in values)) throw new Error(`prompt ${template.ref} needs {{${name}}}`);
    return values[name]!;
  });
}
