/**
 * STRAT-06 (Phase 6 Success Criteria 4) — Strategy note query stubs.
 *
 * Wave 0: skip-stub. 06-03 fills these in by mocking getDb().
 * The upsert uses select-then-insert/update because no UNIQUE INDEX exists
 * on unit_strategy_notes.unit_id (06-CONTEXT discretion: do NOT add it).
 */
describe("strategyNotes queries — getStrategyNote", () => {
  it.skip("returns null when no row exists for the given unit_id", () => {});
  it.skip("returns the row with all 18 columns (10 existing + 8 new from migration 004) when one exists", () => {});
});

describe("strategyNotes queries — upsertStrategyNote (select-then-insert/update)", () => {
  it.skip("INSERT path: when SELECT returns no row, runs INSERT with all 17 fields including new stat columns", () => {});
  it.skip("UPDATE path: when SELECT returns a row, runs UPDATE WHERE unit_id=$1 with all 16 fields + datetime('now') for updated_at", () => {});
  it.skip("save column accepts integer (3) and stores as INTEGER — never as string '3+'", () => {});
});
