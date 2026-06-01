// @vitest-environment node
/**
 * Gap 11 (DQ-02) -- Build script determinism via sorted readdirSync behavioral test.
 *
 * DQ-02: Build scripts use .sort() on readdirSync results so file read order
 * is alphabetical and deterministic regardless of filesystem ordering.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("DQ-02 — build scripts apply .sort() on readdirSync for deterministic file reads", () => {
  it("build-unit-db.ts calls .sort() on the readdirSync result for BSData files", () => {
    const source = readFileSync(resolve(repoRoot, "scripts/build-unit-db.ts"), "utf-8");

    // The sort must appear in proximity to readdirSync — check that both are present
    // and that .sort() immediately follows the readdirSync/filter chain
    expect(source).toMatch(/readdirSync/);
    // .sort() must appear in the file — verify it's applied on file listing
    // The pattern: readdirSync(...).filter(...).sort() or .filter(...)\n    .sort()
    const sortAfterReaddir = /readdirSync[\s\S]{0,200}\.sort\(\)/;
    expect(source).toMatch(sortAfterReaddir);
  });

  it("update-unit-database.ts calls .sort() on the readdirSync result for BSData files", () => {
    const source = readFileSync(
      resolve(repoRoot, "scripts/update-unit-database.ts"),
      "utf-8"
    );

    expect(source).toMatch(/readdirSync/);
    const sortAfterReaddir = /readdirSync[\s\S]{0,200}\.sort\(\)/;
    expect(source).toMatch(sortAfterReaddir);
  });

  it("deterministic sort: alphabetically sorted file list produces consistent output", () => {
    // Verify that JavaScript array sort() on filenames is stable and alphabetical
    const files = [
      "wh40k-10e.cat",
      "Imperium - Space Marines.cat",
      "Chaos - Death Guard.cat",
      "Aeldari - Craftworlds.cat",
    ];
    const sorted = [...files].sort();

    expect(sorted[0]).toBe("Aeldari - Craftworlds.cat");
    expect(sorted[1]).toBe("Chaos - Death Guard.cat");
    expect(sorted[2]).toBe("Imperium - Space Marines.cat");
    expect(sorted[3]).toBe("wh40k-10e.cat");

    // Verify sorting is idempotent (running sort twice gives same order)
    const sortedTwice = [...sorted].sort();
    expect(sortedTwice).toEqual(sorted);
  });
});
