// @vitest-environment node

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHobbyforgeDb,
  createRulesDb,
  HOBBYFORGE_MIGRATION_COUNT,
  RULES_MIGRATION_COUNT,
} from "./db-helpers";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("migration parity", () => {
  it("all hobbyforge migrations execute without errors (D-04)", () => {
    const db = createHobbyforgeDb();
    db.close();
  });

  it("all rules migrations execute without errors (D-05)", () => {
    const db = createRulesDb();
    db.close();
  });

  it("lib.rs migration count matches helper count (D-06)", () => {
    const libRs = readFileSync(
      resolve(repoRoot, "src-tauri/src/lib.rs"),
      "utf-8",
    );
    // Count all Migration { entries in lib.rs (both get_migrations and get_rules_migrations)
    const matches = libRs.match(/Migration\s*\{/g);
    expect(matches?.length).toBe(
      HOBBYFORGE_MIGRATION_COUNT + RULES_MIGRATION_COUNT,
    );
  });

  it("PRAGMA foreign_keys is ON after migration chain", () => {
    const db = createHobbyforgeDb();
    const result = db.pragma("foreign_keys") as { foreign_keys: number }[];
    expect(result[0].foreign_keys).toBe(1);
    db.close();
  });
});
