/**
 * STRAT-06 (Phase 6 Success Criteria 4) — Army list query function stubs.
 *
 * Wave 0: skip-stub. 06-03 fills these in by mocking getDb() and asserting
 * SQL strings + parameter arrays. tauri-plugin-sql IPC cannot run in jsdom,
 * so all tests mock the client.
 */
describe("armyLists queries — getArmyLists / getArmyListWithUnits", () => {
  it.skip("getArmyLists() calls db.select with 'SELECT * FROM army_lists ORDER BY name ASC'", () => {});
  it.skip("getArmyListWithUnits(listId) JOINs units and computes COALESCE(points_override, u.points, 0) AS effective_points", () => {});
});

describe("armyLists queries — createArmyList / updateArmyList / deleteArmyList", () => {
  it.skip("createArmyList INSERTs name, faction_id, points_limit, list_type, notes and returns lastInsertId", () => {});
  it.skip("updateArmyList uses COALESCE partial-update pattern matching updateUnit/updatePaint", () => {});
  it.skip("deleteArmyList runs DELETE FROM army_lists WHERE id = $1", () => {});
});

describe("armyLists queries — addUnitToList / removeUnitFromList", () => {
  it.skip("addUnitToList INSERTs list_id, unit_id, points_override, notes (allows duplicate unit_id for same list_id)", () => {});
  it.skip("removeUnitFromList runs DELETE FROM army_list_units WHERE id = $1", () => {});
});

describe("armyLists queries — updateArmyListUnit (NULL-passthrough)", () => {
  it.skip("UPDATE statement is 'SET points_override=$2, notes=$3' — NOT COALESCE — so points_override can be cleared to NULL", () => {});
  it.skip("passing { id, points_override: null, notes: null } sets both columns to NULL in the DB", () => {});
});
