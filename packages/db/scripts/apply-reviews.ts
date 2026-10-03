/**
 * Writes approved Spanish reviews back into the content YAML (decision 0010):
 *   DATABASE_URL=... pnpm --filter @taptics/db apply-reviews --tenant=<tenant id>
 * Then commit the changed files; CI validates them and publishing makes them live.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { applyToYaml, lineStatus, platformLibrary, reviewLines, scenarioFile, yamlPath } from "@taptics/content";
import { withTenant } from "../src/context.js";
import { listSpanishReviews } from "../src/repo.js";

const LIBRARY = join(dirname(fileURLToPath(import.meta.url)), "../../content/library");
const tenantId = process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1];
if (!tenantId) throw new Error("pass --tenant=<tenant id>");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const reviews = await withTenant(db, { tenantId, role: "app_worker" }, () => listSpanishReviews(db));
await db.end();

const library = platformLibrary();
const byKey = new Map(reviews.map((r) => [`${r.contentCode}/${r.lineKey}`, r]));
let edits = 0;
let files = 0;
for (const s of library.scenarios.values()) {
  const lines = reviewLines(library, s.code);
  for (const kind of ["scenario", "persona"] as const) {
    const code = kind === "scenario" ? s.code : s.persona;
    const file = kind === "scenario" ? scenarioFile(LIBRARY, code) : join(LIBRARY, "personas", `${code}.yaml`);
    const mine = lines.filter((l) => l.kind === kind);
    const changes = mine.flatMap((l) => {
      const r = byKey.get(`${l.code}/${l.key}`);
      return r && lineStatus(l, r) === "approved" && r.esFinal !== l.es ? [{ path: yamlPath(library, l), value: r.esFinal }] : [];
    });
    const allApproved = mine.length > 0 && mine.every((l) => lineStatus(l, byKey.get(`${l.code}/${l.key}`)) === "approved");
    if (changes.length === 0 && !allApproved) continue;
    const before = readFileSync(file, "utf8");
    const after = applyToYaml(before, changes, allApproved);
    if (after !== before) {
      writeFileSync(file, after);
      edits += changes.length;
      files += 1;
    }
  }
}
console.log(`applied ${edits} edited lines to ${files} files`);
