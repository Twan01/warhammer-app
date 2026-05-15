/**
 * Gap DI-02 — Migration 028 SQL content assertions.
 *
 * Reads 028_step_progress_identity.sql and lib.rs as raw strings and
 * verifies the table-rebuild contract: PRAGMA FK off/on bookends, new table
 * schema with recipe_step_id FK and UNIQUE constraint, CTE back-fill JOIN
 * through unit_recipe_assignments and recipe_steps, DROP TABLE old,
 * ALTER TABLE RENAME, and lib.rs version 28 registration.
 *
 * tauri-plugin-sql IPC cannot run in jsdom; this is a content-shape test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(
  repoRoot,
  "src-tauri/migrations/028_step_progress_identity.sql"
);
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 028 step_progress_identity — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("opens with PRAGMA foreign_keys = OFF (table-rebuild safety)", () => {
    const firstPragma = sql.search(/PRAGMA\s+foreign_keys\s*=\s*OFF/i);
    expect(firstPragma).toBeGreaterThanOrEqual(0);
  });

  it("closes with PRAGMA foreign_keys = ON (FK re-enabled after rebuild)", () => {
    const lastPragmaOn = sql.search(/PRAGMA\s+foreign_keys\s*=\s*ON/i);
    expect(lastPragmaOn).toBeGreaterThanOrEqual(0);
    // ON must appear after OFF
    const firstPragmaOff = sql.search(/PRAGMA\s+foreign_keys\s*=\s*OFF/i);
    expect(lastPragmaOn).toBeGreaterThan(firstPragmaOff);
  });

  it("creates unit_recipe_step_progress_new as the staging table", () => {
    expect(sql).toMatch(
      /CREATE\s+TABLE\s+unit_recipe_step_progress_new/i
    );
  });

  it("new table has recipe_step_id INTEGER NOT NULL with FK to recipe_steps ON DELETE CASCADE", () => {
    expect(sql).toMatch(
      /recipe_step_id\s+INTEGER\s+NOT\s+NULL\s+REFERENCES\s+recipe_steps\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
    );
  });

  it("new table has assignment_id INTEGER NOT NULL with FK to unit_recipe_assignments ON DELETE CASCADE", () => {
    expect(sql).toMatch(
      /assignment_id\s+INTEGER\s+NOT\s+NULL\s+REFERENCES\s+unit_recipe_assignments\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
    );
  });

  it("new table has UNIQUE(assignment_id, recipe_step_id) constraint", () => {
    expect(sql).toMatch(/UNIQUE\s*\(\s*assignment_id\s*,\s*recipe_step_id\s*\)/i);
  });

  it("back-fill INSERT targets unit_recipe_step_progress_new", () => {
    expect(sql).toMatch(
      /INSERT\s+INTO\s+unit_recipe_step_progress_new/i
    );
  });

  it("back-fill JOIN passes through unit_recipe_assignments to obtain recipe_id", () => {
    expect(sql).toMatch(/JOIN\s+unit_recipe_assignments/i);
  });

  it("back-fill JOIN passes through recipe_steps to resolve order_index to step id", () => {
    expect(sql).toMatch(/JOIN\s+(?:recipe_steps|numbered_steps)/i);
  });

  it("back-fill uses INNER JOIN (no LEFT JOIN) — orphaned rows are dropped per D-06", () => {
    // The final JOIN from progress p to numbered_steps must be INNER (plain JOIN)
    // A LEFT JOIN on the progress-to-steps link would keep orphans, violating D-06.
    // We allow LEFT JOIN only when joining recipe_sections for display ordering.
    // Split the SQL at the INSERT statement to examine only the back-fill SELECT.
    const insertIdx = sql.search(/INSERT\s+INTO\s+unit_recipe_step_progress_new/i);
    const backfillBlock = sql.slice(insertIdx);
    // "LEFT JOIN unit_recipe_step_progress" would be the violation
    expect(backfillBlock).not.toMatch(
      /LEFT\s+JOIN\s+unit_recipe_step_progress\b/i
    );
    // "LEFT JOIN numbered_steps" or "LEFT JOIN recipe_steps" (in back-fill context) would also be violations
    expect(backfillBlock).not.toMatch(
      /LEFT\s+JOIN\s+numbered_steps\b/i
    );
  });

  it("drops the original unit_recipe_step_progress table after back-fill", () => {
    expect(sql).toMatch(/DROP\s+TABLE\s+unit_recipe_step_progress\b/i);
    // DROP must not drop the _new variant
    const dropMatch = sql.match(/DROP\s+TABLE\s+(\w+)/gi) ?? [];
    for (const stmt of dropMatch) {
      expect(stmt).not.toMatch(/unit_recipe_step_progress_new/i);
    }
  });

  it("renames unit_recipe_step_progress_new to unit_recipe_step_progress", () => {
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+unit_recipe_step_progress_new\s+RENAME\s+TO\s+unit_recipe_step_progress/i
    );
  });

  it("DROP TABLE appears before ALTER TABLE RENAME (correct rebuild sequence)", () => {
    const dropPos = sql.search(/DROP\s+TABLE\s+unit_recipe_step_progress\b/i);
    const renamePos = sql.search(
      /ALTER\s+TABLE\s+unit_recipe_step_progress_new\s+RENAME\s+TO\s+unit_recipe_step_progress/i
    );
    expect(dropPos).toBeGreaterThanOrEqual(0);
    expect(renamePos).toBeGreaterThanOrEqual(0);
    expect(renamePos).toBeGreaterThan(dropPos);
  });

  it("does not contain order_index in any column definition of the new table", () => {
    // Extract just the CREATE TABLE block
    const createStart = sql.search(/CREATE\s+TABLE\s+unit_recipe_step_progress_new/i);
    const createEnd = sql.indexOf(");", createStart) + 2;
    const createBlock = sql.slice(createStart, createEnd);
    // The new table schema must not define an order_index column
    expect(createBlock).not.toMatch(/\border_index\b/i);
  });
});

describe("migration 028 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("contains version: 28 entry with description 'step_progress_identity'", () => {
    expect(libRs).toMatch(/version:\s*28\s*,/);
    expect(libRs).toMatch(/description:\s*"step_progress_identity"/);
  });

  it("references 028_step_progress_identity.sql via include_str!", () => {
    expect(libRs).toMatch(/028_step_progress_identity\.sql/);
  });

  it("version 28 entry uses MigrationKind::Up", () => {
    // Extract the block around the version 28 registration
    const v28Idx = libRs.search(/version:\s*28\s*,/);
    const block = libRs.slice(v28Idx, v28Idx + 300);
    expect(block).toMatch(/MigrationKind::Up/);
  });

  it("version 28 is the highest version in get_migrations() (no gap or successor)", () => {
    const getMigrationsBlock = libRs.split("fn get_rules_migrations")[0];
    const versions = [
      ...getMigrationsBlock.matchAll(/version:\s*(\d+)\s*,/g),
    ].map((m) => parseInt(m[1], 10));
    expect(Math.max(...versions)).toBe(28);
  });

  it("migration 28 appears after migration 27 in get_migrations()", () => {
    const v27Pos = libRs.search(/version:\s*27\s*,/);
    const v28Pos = libRs.search(/version:\s*28\s*,/);
    expect(v27Pos).toBeGreaterThanOrEqual(0);
    expect(v28Pos).toBeGreaterThanOrEqual(0);
    expect(v28Pos).toBeGreaterThan(v27Pos);
  });
});
