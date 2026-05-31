// @vitest-environment node

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHobbyforgeDb,
  HOBBYFORGE_MIGRATION_COUNT,
} from "./db-helpers";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("migration parity", () => {
  it("all hobbyforge migrations execute without errors (D-04)", () => {
    const db = createHobbyforgeDb();
    db.close();
  });

  // Phase 107: rules.db eliminated — rules migration test removed
  it.todo("all rules migrations execute without errors (D-05) — rules.db removed in Phase 107");

  it("lib.rs migration count matches helper count (D-06)", () => {
    const libRs = readFileSync(
      resolve(repoRoot, "src-tauri/src/lib.rs"),
      "utf-8",
    );
    // Phase 107: only hobbyforge migrations remain (rules migrations removed)
    const matches = libRs.match(/Migration\s*\{/g);
    expect(matches?.length).toBe(HOBBYFORGE_MIGRATION_COUNT);
  });

  it("PRAGMA foreign_keys is ON after migration chain", () => {
    const db = createHobbyforgeDb();
    const result = db.pragma("foreign_keys") as { foreign_keys: number }[];
    expect(result[0].foreign_keys).toBe(1);
    db.close();
  });
});
