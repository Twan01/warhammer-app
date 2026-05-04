/**
 * Phase 15 — Migration content tests.
 *
 * Reads the migration SQL files and lib.rs registration as raw strings and verifies
 * the additive-only contract. tauri-plugin-sql IPC cannot run in jsdom; this is a
 * content-shape test, not a behavior test. Mirrors tests/hobby-journal/migration005.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rulesSchemaPath = resolve(repoRoot, "src-tauri/migrations/rules_001_schema.sql");
const datasheetLinkPath = resolve(repoRoot, "src-tauri/migrations/007_datasheet_link.sql");
const wargearAbilitiesPath = resolve(repoRoot, "src-tauri/migrations/rules_002_wargear_abilities.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");
const tauriConfPath = resolve(repoRoot, "src-tauri/tauri.conf.json");

describe("rules_001_schema.sql + migration 007", () => {
  it("DS-01: rules_001_schema.sql contains all 7 rw_* tables and the rw_sync_meta single-row check", () => {
    const sql = readFileSync(rulesSchemaPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_factions/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_datasheets/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_datasheet_models/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_datasheet_abilities/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_datasheet_keywords/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_sources/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_sync_meta/);
    expect(sql).toMatch(/id\s+INTEGER PRIMARY KEY CHECK \(id = 1\)/);
    expect(sql).toMatch(/datasheet_id\s+TEXT NOT NULL REFERENCES rw_datasheets\(id\) ON DELETE CASCADE/);
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });

  it("DS-06: 007_datasheet_link.sql adds datasheet_id TEXT column to unit_strategy_notes (NO REFERENCES — cross-DB FK not supported)", () => {
    const sql = readFileSync(datasheetLinkPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE unit_strategy_notes ADD COLUMN datasheet_id TEXT/);
    expect(sql).not.toMatch(/REFERENCES rw_datasheets/);
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });

  it("DS-01 + DS-06: src-tauri/src/lib.rs registers BOTH databases — version: 7 entry for hobbyforge.db AND get_rules_migrations() chained for sqlite:rules.db; tauri.conf.json preloads both", () => {
    const libRs = readFileSync(libRsPath, "utf-8");
    expect(libRs).toMatch(/version:\s*7\s*,/);
    expect(libRs).toMatch(/description:\s*"datasheet_link"/);
    expect(libRs).toMatch(/007_datasheet_link\.sql/);
    expect(libRs).toMatch(/fn get_rules_migrations\(\)/);
    expect(libRs).toMatch(/description:\s*"rules_schema"/);
    expect(libRs).toMatch(/rules_001_schema\.sql/);
    expect(libRs).toMatch(/\.add_migrations\("sqlite:rules\.db",\s*get_rules_migrations\(\)\)/);
    // G-4b: lib.rs must also reference the wargear/abilities migration
    expect(libRs).toMatch(/rules_002_wargear_abilities\.sql|rules_wargear_abilities/);

    const conf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
    expect(conf.plugins.sql.preload).toContain("sqlite:hobbyforge.db");
    expect(conf.plugins.sql.preload).toContain("sqlite:rules.db");
  });
});

describe("rules_002_wargear_abilities.sql", () => {
  it("G-4b: creates all 5 new tables using CREATE TABLE IF NOT EXISTS (additive-only)", () => {
    const sql = readFileSync(wargearAbilitiesPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_datasheets_wargear/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_abilities/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_stratagems/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_detachments/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS rw_detachment_abilities/);
  });

  it("G-4b: does NOT contain DROP or DELETE FROM statements", () => {
    const sql = readFileSync(wargearAbilitiesPath, "utf-8");
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bDELETE FROM\b/i);
  });
});
