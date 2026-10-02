import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { ZodType } from "zod";
import {
  behaviorCardSchema,
  glossarySchema,
  lexiconSchema,
  moduleSchema,
  objectionSchema,
  personaSchema,
  rubricSchema,
  ruleSchema,
  scenarioSchema,
  techniqueSchema,
  type BehaviorCard,
  type GlossaryTerm,
  type Lexicon,
  type Module,
  type Objection,
  type Persona,
  type Rubric,
  type Rule,
  type Scenario,
  type Technique,
} from "./schemas.js";

export const PLATFORM_LIBRARY = resolve(dirname(fileURLToPath(import.meta.url)), "../library");

export interface Library {
  techniques: Map<string, Technique>;
  objections: Map<string, Objection>;
  personas: Map<string, Persona>;
  scenarios: Map<string, Scenario>;
  rubrics: Map<string, Rubric>;
  rules: Map<string, Rule>;
  behaviorCards: Map<string, BehaviorCard>;
  modules: Map<string, Module>;
  glossary: GlossaryTerm[];
  lexicon: Lexicon | null;
}

export interface ContentError {
  file: string;
  message: string;
}

/** One layer of content: the platform library, a tenant override or a store override (spec 3.1). */
export interface ContentLayer {
  scope: "platform" | "tenant" | "store";
  dir: string;
}

function yamlFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return yamlFiles(path);
      return name.endsWith(".yaml") || name.endsWith(".yml") ? [path] : [];
    });
}

function readYaml(file: string, errors: ContentError[], root: string): unknown {
  try {
    return parse(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push({ file: relative(root, file), message: `YAML parse error: ${(error as Error).message}` });
    return undefined;
  }
}

function loadInto<T extends { code: string }>(
  map: Map<string, T>,
  dir: string,
  schema: ZodType<T>,
  errors: ContentError[],
  root: string,
  layer: ContentLayer,
  onOverride?: (previous: T, next: T, file: string) => void,
) {
  for (const file of yamlFiles(dir)) {
    const raw = readYaml(file, errors, root);
    if (raw === undefined) continue;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ file: relative(root, file), message: `${issue.path.join(".") || "(root)"}: ${issue.message}` });
      }
      continue;
    }
    const item = parsed.data;
    const expectedPrefix = item.code;
    if (layer.scope === "platform" && !basename(file).startsWith(expectedPrefix)) {
      errors.push({ file: relative(root, file), message: `file name must start with its code ${expectedPrefix}` });
    }
    const previous = map.get(item.code);
    if (previous && onOverride) onOverride(previous, item, relative(root, file));
    else if (previous && layer.scope === "platform") {
      errors.push({ file: relative(root, file), message: `duplicate code ${item.code}` });
    }
    map.set(item.code, item);
  }
}

/**
 * A store or tenant may override a critical rule only to make it stricter: it stays critical and enabled, and
 * keeps every pattern it had (spec 3.1: "cannot override a compliance rule to make it weaker").
 */
export function relaxesCriticalRule(previous: Rule, next: Rule): string | null {
  if (previous.severity !== "critical") return null;
  if (next.severity !== "critical") return "a critical rule cannot be downgraded";
  if (!next.enabled) return "a critical rule cannot be disabled";
  if (previous.applies_to.some((s) => !next.applies_to.includes(s))) {
    return "a critical rule cannot stop applying to a speaker";
  }
  if (previous.channels.some((c) => !next.channels.includes(c))) return "a critical rule cannot stop applying to a channel";
  const patterns = (rule: Rule) => (rule.parameters["patterns"] ?? { en: [], es: [] }) as { en?: string[]; es?: string[] };
  for (const lang of ["en", "es"] as const) {
    const kept = new Set(patterns(next)[lang] ?? []);
    if ((patterns(previous)[lang] ?? []).some((p) => !kept.has(p))) return `a critical rule cannot drop ${lang} patterns`;
  }
  return null;
}

export function emptyLibrary(): Library {
  return {
    techniques: new Map(),
    objections: new Map(),
    personas: new Map(),
    scenarios: new Map(),
    rubrics: new Map(),
    rules: new Map(),
    behaviorCards: new Map(),
    modules: new Map(),
    glossary: [],
    lexicon: null,
  };
}

/**
 * Loads content layers from least to most specific: platform, then tenant, then store (spec 3.1).
 * Returns every schema and override error instead of throwing, so CI can print them all at once.
 */
export function loadLibrary(layers: ContentLayer[] = [{ scope: "platform", dir: PLATFORM_LIBRARY }]): {
  library: Library;
  errors: ContentError[];
} {
  const library = emptyLibrary();
  const errors: ContentError[] = [];
  const root = layers[0]?.dir ?? PLATFORM_LIBRARY;
  const allow = <T>() => (_p: T, _n: T, _f: string) => {};
  for (const layer of layers) {
    const d = (name: string) => join(layer.dir, name);
    const override = layer.scope !== "platform";
    loadInto(library.techniques, d("techniques"), techniqueSchema, errors, root, layer, override ? allow() : undefined);
    loadInto(library.objections, d("objections"), objectionSchema as unknown as ZodType<Objection>, errors, root, layer, override ? allow() : undefined);
    loadInto(library.personas, d("personas"), personaSchema, errors, root, layer, override ? allow() : undefined);
    loadInto(library.scenarios, d("scenarios"), scenarioSchema, errors, root, layer, override ? allow() : undefined);
    loadInto(library.rubrics, d("rubrics"), rubricSchema as unknown as ZodType<Rubric>, errors, root, layer, override ? allow() : undefined);
    loadInto(library.behaviorCards, d("behavior-cards"), behaviorCardSchema, errors, root, layer, override ? allow() : undefined);
    loadInto(library.modules, d("modules"), moduleSchema, errors, root, layer, override ? allow() : undefined);
    const ruleDir = d("rules");
    for (const file of yamlFiles(ruleDir)) {
      if (basename(file) === "lexicon.yaml") {
        const raw = readYaml(file, errors, root);
        const parsed = lexiconSchema.safeParse(raw);
        if (parsed.success) library.lexicon = parsed.data;
        else for (const issue of parsed.error.issues) errors.push({ file: relative(root, file), message: `${issue.path.join(".")}: ${issue.message}` });
      }
    }
    loadRules(library, ruleDir, errors, root, layer);
    for (const file of yamlFiles(d("glossary"))) {
      const raw = readYaml(file, errors, root);
      const parsed = glossarySchema.safeParse(raw);
      if (parsed.success) library.glossary = mergeGlossary(library.glossary, parsed.data.terms);
      else for (const issue of parsed.error.issues) errors.push({ file: relative(root, file), message: `${issue.path.join(".")}: ${issue.message}` });
    }
  }
  return { library, errors };
}

function loadRules(library: Library, dir: string, errors: ContentError[], root: string, layer: ContentLayer) {
  for (const file of yamlFiles(dir)) {
    if (basename(file) === "lexicon.yaml") continue;
    const raw = readYaml(file, errors, root);
    if (raw === undefined) continue;
    const parsed = ruleSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push({ file: relative(root, file), message: `${issue.path.join(".")}: ${issue.message}` });
      continue;
    }
    const rule = parsed.data;
    const previous = library.rules.get(rule.code);
    if (previous) {
      if (layer.scope === "platform") {
        errors.push({ file: relative(root, file), message: `duplicate rule ${rule.code}` });
        continue;
      }
      const problem = relaxesCriticalRule(previous, rule);
      if (problem) {
        errors.push({ file: relative(root, file), message: `rejected override of ${rule.code}: ${problem}` });
        continue;
      }
    }
    library.rules.set(rule.code, rule);
  }
}

function mergeGlossary(base: GlossaryTerm[], overrides: GlossaryTerm[]): GlossaryTerm[] {
  const byEn = new Map(base.map((t) => [t.en.toLowerCase(), t]));
  for (const term of overrides) byEn.set(term.en.toLowerCase(), term);
  return [...byEn.values()];
}

let cached: Library | null = null;

/** The validated platform library, cached. Throws if the library has errors (CI keeps it clean). */
export function platformLibrary(): Library {
  if (cached) return cached;
  const { library, errors } = loadLibrary();
  if (errors.length > 0) {
    throw new Error(`content library has ${errors.length} errors; run pnpm content:validate\n${errors.slice(0, 5).map((e) => `${e.file}: ${e.message}`).join("\n")}`);
  }
  cached = library;
  return library;
}
