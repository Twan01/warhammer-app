/**
 * Phase 14 — Migration 006 file content assertions.
 *
 * Reads the migration SQL and the lib.rs registration as raw strings and
 * verifies the additive-only contract. tauri-plugin-sql IPC cannot run in
 * jsdom; this is a content-shape test, not a behavior test.
 *
 * Note: This test file is named migration005.test.ts (Wave 0 stub name)
 * but tests 006_spend_pence.sql (version 6) because Phase 13 hobby_journal
 * migration was inserted as version 5 after this stub was created.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/006_spend_pence.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 005 spend_pence — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("contains only ALTER TABLE ADD COLUMN and UPDATE statements (no DROP, no CREATE TABLE)", () => {
    expect(sql).not.toMatch(/DROP\b/i);
    expect(sql).not.toMatch(/CREATE\s+TABLE/i);
    const alterCount = (sql.match(/ALTER\s+TABLE/gi) ?? []).length;
    expect(alterCount).toBeGreaterThanOrEqual(2);
  });

  it("declares purchase_price_pence INTEGER on units table", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+units\s+ADD\s+COLUMN\s+purchase_price_pence\s+INTEGER/i);
  });

  it("declares purchase_price_pence INTEGER on paints table", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+paints\s+ADD\s+COLUMN\s+purchase_price_pence\s+INTEGER/i);
  });

  it("contains UPDATE statement migrating units.purchase_price (REAL) to purchase_price_pence (INTEGER) via *100 conversion", () => {
    expect(sql).toMatch(/UPDATE\s+units/i);
    expect(sql).toMatch(/SET\s+purchase_price_pence\s*=/i);
    expect(sql).toMatch(/purchase_price\s*\*\s*100/);
    expect(sql).toMatch(/CAST.*AS\s+INTEGER/i);
  });
});

describe("migration 005 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("src-tauri/src/lib.rs contains version: 6 entry referencing 006_spend_pence.sql", () => {
    expect(libRs).toMatch(/version:\s*6\s*,/);
    expect(libRs).toMatch(/description:\s*"spend_pence"/);
    expect(libRs).toMatch(/006_spend_pence\.sql/);
  });
});
