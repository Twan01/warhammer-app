/**
 * STRAT-06 — Migration 004 file content assertions.
 *
 * Reads the migration SQL and the lib.rs registration as raw strings and
 * verifies the additive-only contract. tauri-plugin-sql IPC cannot run in
 * jsdom; this is a content-shape test, not a behavior test.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/004_unit_playbook_stats.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 004 unit_playbook_stats — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("contains only ALTER TABLE ADD COLUMN statements (no DROP, no CREATE TABLE)", () => {
    expect(sql).not.toMatch(/DROP\b/i);
    expect(sql).not.toMatch(/CREATE\s+TABLE/i);
    // At least 8 ALTER TABLE statements
    const alterCount = (sql.match(/ALTER\s+TABLE/gi) ?? []).length;
    expect(alterCount).toBeGreaterThanOrEqual(8);
  });

  it("declares all 8 new columns: move, toughness, save, wounds, leadership, objective_control, keywords, abilities", () => {
    expect(sql).toMatch(/ADD\s+COLUMN\s+move\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+toughness\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+save\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+wounds\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+leadership\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+objective_control\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+keywords\b/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+abilities\b/);
  });

  it("declares save column as INTEGER (not TEXT)", () => {
    expect(sql).toMatch(/ADD\s+COLUMN\s+save\s+INTEGER/);
    expect(sql).not.toMatch(/ADD\s+COLUMN\s+save\s+TEXT/);
  });

  it("declares move/toughness/wounds/leadership/objective_control as INTEGER", () => {
    expect(sql).toMatch(/ADD\s+COLUMN\s+move\s+INTEGER/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+toughness\s+INTEGER/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+wounds\s+INTEGER/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+leadership\s+INTEGER/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+objective_control\s+INTEGER/);
  });

  it("declares keywords and abilities as TEXT", () => {
    expect(sql).toMatch(/ADD\s+COLUMN\s+keywords\s+TEXT/);
    expect(sql).toMatch(/ADD\s+COLUMN\s+abilities\s+TEXT/);
  });
});

describe("migration 004 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("src-tauri/src/lib.rs contains version: 4 entry referencing 004_unit_playbook_stats.sql", () => {
    expect(libRs).toMatch(/version:\s*4\s*,/);
    expect(libRs).toMatch(/description:\s*"unit_playbook_stats"/);
    expect(libRs).toMatch(/004_unit_playbook_stats\.sql/);
  });
});
