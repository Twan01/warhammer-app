/**
 * Phase 17 — Migration 008 file content assertions.
 *
 * Reads the migration SQL and the lib.rs registration as raw strings and
 * verifies the additive-only contract. tauri-plugin-sql IPC cannot run in
 * jsdom; this is a content-shape test, not a behavior test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/008_enrichment.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 008 enrichment — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("contains only ALTER TABLE ADD COLUMN statements (no DROP, no CREATE TABLE)", () => {
    expect(sql).not.toMatch(/DROP\b/i);
    expect(sql).not.toMatch(/CREATE\s+TABLE/i);
    const alterCount = (sql.match(/ALTER\s+TABLE/gi) ?? []).length;
    expect(alterCount).toBeGreaterThanOrEqual(4);
  });

  it("declares lore_notes TEXT on units table", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+units\s+ADD\s+COLUMN\s+lore_notes\s+TEXT/i);
  });

  it("declares undercoat TEXT on units table", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+units\s+ADD\s+COLUMN\s+undercoat\s+TEXT/i);
  });

  it("declares lore_notes TEXT on factions table", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+factions\s+ADD\s+COLUMN\s+lore_notes\s+TEXT/i);
  });

  it("declares purchase_date TEXT on paints table", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+paints\s+ADD\s+COLUMN\s+purchase_date\s+TEXT/i);
  });
});

describe("migration 008 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("src-tauri/src/lib.rs contains version: 8 entry referencing 008_enrichment.sql with description 'enrichment'", () => {
    expect(libRs).toMatch(/version:\s*8\s*,/);
    expect(libRs).toMatch(/description:\s*"enrichment"/);
    expect(libRs).toMatch(/008_enrichment\.sql/);
  });
});
