/**
 * Publishes the validated platform library as an immutable content release (spec 7.4 item 5). The version is a
 * hash of the content, so publishing the same library twice is a no-op.
 *
 *   DATABASE_URL=... pnpm db:publish-content
 */
import { createHash } from "node:crypto";
import pg from "pg";
import { loadLibrary } from "@taptics/content";
import { publishPlatformRelease } from "../src/repo.js";

const { library, errors } = loadLibrary();
if (errors.length) {
  console.error(`content has ${errors.length} errors; run pnpm content:validate`);
  process.exit(1);
}
const items = [
  ...[...library.techniques.values()].map((body) => ({ kind: "technique", code: body.code, body })),
  ...[...library.objections.values()].map((body) => ({ kind: "objection", code: body.code, body })),
  ...[...library.personas.values()].map((body) => ({ kind: "persona", code: body.code, body })),
  ...[...library.scenarios.values()].map((body) => ({ kind: "scenario", code: body.code, body })),
  ...[...library.rubrics.values()].map((body) => ({ kind: "rubric", code: body.code, body })),
  ...[...library.rules.values()].map((body) => ({ kind: "rule", code: body.code, body })),
  ...[...library.behaviorCards.values()].map((body) => ({ kind: "behavior_card", code: body.code, body })),
  ...[...library.modules.values()].map((body) => ({ kind: "module", code: body.code, body })),
  { kind: "glossary", code: "terms", body: library.glossary },
  { kind: "lexicon", code: "lexicon", body: library.lexicon },
];
const version = `sha-${createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 12)}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const id = await publishPlatformRelease(db, version, `Platform library: ${library.techniques.size} techniques, ${library.objections.size} objections, ${library.scenarios.size} scenarios`, items);
console.log(`platform release ${version} (${id}) with ${items.length} items`);
await db.end();
