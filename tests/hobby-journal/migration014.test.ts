/**
 * INTEG-01 — Migration 014 file content assertions.
 *
 * Reads the migration SQL and the lib.rs registration as raw strings and
 * verifies the additive-only contract and FK references. tauri-plugin-sql
 * IPC cannot run in jsdom; this is a content-shape test, not a behavior test.
 * Mirrors tests/foundation/migration004.test.ts and tests/hobby-journal/migration005.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/014_session_recipe_link.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 014 session_recipe_link — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("contains only ALTER TABLE ADD COLUMN statements (no DROP, no CREATE TABLE)", () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/CREATE\s+TABLE/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });

  it("is additive-only — exactly two ALTER TABLE ADD COLUMN statements, nothing destructive", () => {
    // Count only ALTER TABLE ADD COLUMN statements (ignores comments mentioning ALTER TABLE)
    const alterCount = (sql.match(/^ALTER\s+TABLE/gim) ?? []).length;
    expect(alterCount).toBe(2);
  });

  it("declares recipe_id column on painting_sessions with REFERENCES painting_recipes(id) ON DELETE SET NULL", () => {
    expect(sql).toMatch(
      /ALTER TABLE painting_sessions ADD COLUMN recipe_id\s+INTEGER\s+REFERENCES painting_recipes\(id\)\s+ON DELETE SET NULL/
    );
  });

  it("declares recipe_step_id column on painting_sessions with REFERENCES recipe_steps(id) ON DELETE SET NULL", () => {
    expect(sql).toMatch(
      /ALTER TABLE painting_sessions ADD COLUMN recipe_step_id\s+INTEGER\s+REFERENCES recipe_steps\(id\)\s+ON DELETE SET NULL/
    );
  });

  it("both columns target the painting_sessions table", () => {
    const alterStatements = sql.match(/ALTER TABLE \w+ ADD COLUMN \w+/gi) ?? [];
    expect(alterStatements).toHaveLength(2);
    for (const stmt of alterStatements) {
      expect(stmt).toMatch(/ALTER TABLE painting_sessions/i);
    }
  });
});

describe("migration 013 and 014 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("src-tauri/src/lib.rs contains version: 13 entry referencing 013_step_photos_alt_paint.sql", () => {
    expect(libRs).toMatch(/version:\s*13\s*,/);
    expect(libRs).toMatch(/description:\s*"step_photos_alt_paint"/);
    expect(libRs).toMatch(/013_step_photos_alt_paint\.sql/);
  });

  it("src-tauri/src/lib.rs contains version: 14 entry referencing 014_session_recipe_link.sql with description 'session_recipe_link'", () => {
    expect(libRs).toMatch(/version:\s*14\s*,/);
    expect(libRs).toMatch(/description:\s*"session_recipe_link"/);
    expect(libRs).toMatch(/014_session_recipe_link\.sql/);
  });
});
