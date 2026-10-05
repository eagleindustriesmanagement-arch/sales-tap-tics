import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STRINGS } from "@taptics/i18n";

// The audit log (spec 18.3) shows each entry in plain words; a code with no string showed raw ("invite.create").
// Every action the app writes, from the repository code or from a migration's SQL function, needs a sentence.
const db = join(import.meta.dirname, "..", "..", "..", "packages", "db");

function written(): Set<string> {
  const actions = new Set<string>();
  for (const name of readdirSync(join(db, "src")).filter((n) => n.endsWith(".ts"))) {
    for (const line of readFileSync(join(db, "src", name), "utf8").split("\n")) {
      if (!line.includes("audit(db,")) continue;
      for (const m of line.matchAll(/"([a-z_]+\.[a-z_]+)"/g)) actions.add(m[1]!);
    }
  }
  for (const name of readdirSync(join(db, "migrations")).filter((n) => n.endsWith(".sql"))) {
    const sql = readFileSync(join(db, "migrations", name), "utf8");
    for (const m of sql.matchAll(/insert into audit_log[^;]*?values\s*\(([^;]*?)\);/gi)) {
      for (const a of m[1]!.matchAll(/'([a-z_]+\.[a-z_]+)'/g)) actions.add(a[1]!);
    }
  }
  return actions;
}

describe("audit log actions", () => {
  it("finds the actions the app writes", () => {
    const actions = written();
    for (const a of ["person.joined", "invite.create", "invite.revoke", "tenant.signup", "session.read", "person.deactivate", "person.reactivate"]) expect(actions).toContain(a);
  });

  it("every action written anywhere has a plain sentence in both languages", () => {
    const missing = [...written()].filter((a) => !(`audit.action.${a}` in STRINGS));
    expect(missing).toEqual([]);
  });
});
