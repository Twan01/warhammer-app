/**
 * Gap 1 + Gap 3 (partial) — Migration 026 file content assertions.
 *
 * Reads 026_unit_rules_mapping.sql and lib.rs as raw strings and verifies
 * the schema contract: CREATE TABLE shape, 7 columns, UNIQUE unit_id,
 * CASCADE FK, match_status DEFAULT 'auto', and lib.rs version 26 registration.
 *
 * tauri-plugin-sql IPC cannot run in jsdom; this is a content-shape test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/026_unit_rules_mapping.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 026 unit_rules_mapping — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("opens with CREATE TABLE IF NOT EXISTS unit_rules_mapping", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+unit_rules_mapping/i);
  });

  it("does not contain any DROP or ALTER TABLE statements", () => {
    expect(sql).not.toMatch(/DROP\b/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE/i);
  });

  it("declares all 7 required columns: id, unit_id, rules_datasheet_id, match_status, source, created_at, updated_at", () => {
    expect(sql).toMatch(/\bid\b/);
    expect(sql).toMatch(/\bunit_id\b/);
    expect(sql).toMatch(/\brules_datasheet_id\b/);
    expect(sql).toMatch(/\bmatch_status\b/);
    expect(sql).toMatch(/\bsource\b/);
    expect(sql).toMatch(/\bcreated_at\b/);
    expect(sql).toMatch(/\bupdated_at\b/);
  });

  it("declares id as INTEGER PRIMARY KEY AUTOINCREMENT", () => {
    expect(sql).toMatch(/\bid\b\s+INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/i);
  });

  it("declares unit_id with UNIQUE constraint inline on the column", () => {
    expect(sql).toMatch(/\bunit_id\b[^\n]*UNIQUE/i);
  });

  it("declares unit_id with REFERENCES units(id) ON DELETE CASCADE", () => {
    expect(sql).toMatch(/\bunit_id\b[^\n]*REFERENCES\s+units\s*\(\s*id\s*\)[^\n]*ON\s+DELETE\s+CASCADE/i);
  });

  it("declares rules_datasheet_id as nullable TEXT (no NOT NULL)", () => {
    // Must be TEXT type
    expect(sql).toMatch(/\brules_datasheet_id\b\s+TEXT/i);
    // Must NOT have NOT NULL on this column line
    const line = sql.split("\n").find(l => /\brules_datasheet_id\b/.test(l)) ?? "";
    expect(line).not.toMatch(/NOT\s+NULL/i);
  });

  it("declares match_status as TEXT NOT NULL DEFAULT 'auto'", () => {
    expect(sql).toMatch(/\bmatch_status\b\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'auto'/i);
  });

  it("declares source as nullable TEXT (no NOT NULL)", () => {
    expect(sql).toMatch(/\bsource\b\s+TEXT/i);
    const line = sql.split("\n").find(l => /\bsource\b/.test(l) && !/--/.test(l.trim().substring(0, l.indexOf("source")))) ?? "";
    if (line) {
      expect(line).not.toMatch(/NOT\s+NULL/i);
    }
  });

  it("declares created_at and updated_at as TEXT NOT NULL with datetime('now') default", () => {
    expect(sql).toMatch(/\bcreated_at\b\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+\(datetime\('now'\)\)/i);
    expect(sql).toMatch(/\bupdated_at\b\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+\(datetime\('now'\)\)/i);
  });
});

describe("migration 026 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("contains version: 26 entry with description 'unit_rules_mapping' referencing 026_unit_rules_mapping.sql", () => {
    expect(libRs).toMatch(/version:\s*26\s*,/);
    expect(libRs).toMatch(/description:\s*"unit_rules_mapping"/);
    expect(libRs).toMatch(/026_unit_rules_mapping\.sql/);
  });
});
