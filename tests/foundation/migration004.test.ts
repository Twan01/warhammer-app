/**
 * STRAT-06 — Migration 004 file content stubs.
 *
 * Wave 0: skip-stub. 06-01 fills in real assertions that read
 * src-tauri/migrations/004_unit_playbook_stats.sql as a string and
 * verify ALTER-TABLE-only / column list / save INTEGER.
 */
describe("migration 004 unit_playbook_stats — file content", () => {
  it.skip("contains only ALTER TABLE ADD COLUMN statements (no DROP, no CREATE TABLE)", () => {});
  it.skip("declares all 8 new columns: move, toughness, save, wounds, leadership, objective_control, keywords, abilities", () => {});
  it.skip("declares save column as INTEGER (not TEXT)", () => {});
  it.skip("declares move/toughness/wounds/leadership/objective_control as INTEGER", () => {});
  it.skip("declares keywords and abilities as TEXT", () => {});
});

describe("migration 004 — lib.rs registration", () => {
  it.skip("src-tauri/src/lib.rs contains version: 4 entry referencing 004_unit_playbook_stats.sql", () => {});
});
