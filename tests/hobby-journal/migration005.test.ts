/**
 * Phase 13 — Migration 005 file content assertions.
 *
 * Reads the migration SQL and lib.rs registration as raw strings and verifies
 * the additive-only contract. tauri-plugin-sql IPC cannot run in jsdom; this
 * is a content-shape test, not a behavior test. Mirrors tests/foundation/migration004.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/005_hobby_journal.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 005 hobby_journal — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("contains CREATE TABLE painting_sessions with the 5 expected columns + ON DELETE CASCADE on unit_id", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS painting_sessions/);
    expect(sql).toMatch(/unit_id\s+INTEGER\s+NOT NULL\s+REFERENCES units\(id\)\s+ON DELETE CASCADE/);
    expect(sql).toMatch(/session_date\s+TEXT\s+NOT NULL/);
    expect(sql).toMatch(/duration_minutes\s+INTEGER\s+NOT NULL/);
    expect(sql).toMatch(/notes\s+TEXT/);
    expect(sql).toMatch(/created_at\s+TEXT\s+NOT NULL\s+DEFAULT \(datetime\('now'\)\)/);
  });

  it("adds stage_label TEXT column to image_assets via ALTER TABLE", () => {
    expect(sql).toMatch(/ALTER TABLE image_assets ADD COLUMN stage_label TEXT/);
  });

  it("contains only additive statements — no DROP, no DELETE FROM, no DROP TABLE", () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });
});

describe("migration 005 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("src-tauri/src/lib.rs contains version: 5 entry referencing 005_hobby_journal.sql", () => {
    expect(libRs).toMatch(/version:\s*5\s*,/);
    expect(libRs).toMatch(/description:\s*"hobby_journal"/);
    expect(libRs).toMatch(/005_hobby_journal\.sql/);
  });
});
