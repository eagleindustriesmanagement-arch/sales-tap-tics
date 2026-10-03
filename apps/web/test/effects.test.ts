import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// An effect written as `useEffect(() => something(), deps)` hands React whatever something() returns as its cleanup.
// A browser API that starts returning a promise (scrollIntoView did) then crashes the screen on the next change:
// production's "TypeError: i is not a function" on the first typed Send (October 3). Effects use a block body.
const root = join(import.meta.dirname, "..");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("effects never return a value by accident", () => {
  it("every useEffect and useLayoutEffect callback has a block body", () => {
    const offenders = ["app", "components", "lib"].flatMap((d) => files(join(root, d))).flatMap((file) =>
      readFileSync(file, "utf8").split("\n").flatMap((line, i) => (/use(Layout)?Effect\(\s*(async\s*)?\(\)\s*=>\s*[^{\s]/.test(line) ? [`${relative(root, file)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});
