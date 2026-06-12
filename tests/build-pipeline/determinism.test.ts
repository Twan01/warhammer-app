// @vitest-environment node
/**
 * DQ-02 — Build pipeline determinism.
 *
 * Intent: the unit-database build must read its source files in a deterministic
 * order so builds are reproducible regardless of filesystem ordering.
 *
 * The original BSData pipeline achieved this by calling .sort() on a
 * readdirSync() of the .cat catalog directory. That pipeline was removed in the
 * v0.4.7 Wahapedia migration (commit 2d5e960d, "remove BSData files, types, and
 * @xmldom/xmldom dependency"). The current pipeline reads explicitly-NAMED
 * Wahapedia CSV files by exact path (REQUIRED_CSVS in build-unit-db.ts), so the
 * read order is deterministic by construction — there is no directory
 * enumeration to sort.
 *
 * This test now guards that invariant: build scripts read named files directly,
 * and no script may reintroduce non-deterministic directory enumeration
 * (a readdirSync() whose result is not sorted).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptsDir = resolve(repoRoot, "scripts");

/** Recursively collect every .ts source file under scripts/. */
function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("DQ-02 — build pipeline reads sources in deterministic order", () => {
  it("build-unit-db.ts reads named Wahapedia CSV files via the shared parseCsv lib", () => {
    const source = readFileSync(
      resolve(scriptsDir, "build-unit-db.ts"),
      "utf-8"
    );

    // Explicit named reads through the shared lib — not directory enumeration.
    expect(source).toMatch(/from\s+["']\.\/lib\/parseCsv/);
    // Files are referenced by exact name (e.g. the REQUIRED_CSVS manifest).
    expect(source).toMatch(/["']Datasheets\.csv["']/);
    expect(source).toMatch(/["']Factions\.csv["']/);
  });

  it("no build script enumerates a directory without sorting (readdirSync must be followed by .sort())", () => {
    const offenders: string[] = [];

    for (const file of collectTsFiles(scriptsDir)) {
      const src = readFileSync(file, "utf-8");
      if (!/readdirSync/.test(src)) continue; // no enumeration → deterministic
      // If a script does enumerate a directory, the result must be sorted.
      if (!/readdirSync[\s\S]{0,200}\.sort\(\)/.test(src)) {
        offenders.push(file.replace(repoRoot, "").replace(/\\/g, "/"));
      }
    }

    expect(
      offenders,
      `readdirSync without a following .sort() found in: ${offenders.join(", ")}`
    ).toEqual([]);
  });

  it("deterministic sort: array sort() on CSV filenames is alphabetical and idempotent", () => {
    const files = [
      "Datasheets_wargear.csv",
      "Datasheets.csv",
      "Factions.csv",
      "Datasheets_models.csv",
    ];
    const sorted = [...files].sort();

    expect(sorted).toEqual([
      "Datasheets.csv",
      "Datasheets_models.csv",
      "Datasheets_wargear.csv",
      "Factions.csv",
    ]);

    // Sorting is idempotent — running it twice gives the same order.
    expect([...sorted].sort()).toEqual(sorted);
  });
});
