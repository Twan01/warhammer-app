/** Wave 0 stubs for PLAY-02 — army list readiness batch query + hook + BattleLogRow display. Plan 29-01 fills query/hook stubs. Plan 29-03 fills UI stubs. */
import { describe, it } from "vitest";

describe.skip("getArmyListReadiness query (PLAY-02)", () => {
  it.skip("returns total_points and battle_ready_points per army list id");
  // TODO Plan 29-01: mock getDb, call with [1,2],
  // assert db.select called with GROUP BY SQL and IN clause

  it.skip("returns empty array when called with empty ids array");
  // TODO Plan 29-01: call with [], assert returns [] without hitting db

  it.skip("uses COALESCE(points_override, points, 0) for effective points in SQL");
  // TODO Plan 29-01: assert SQL string contains COALESCE

  it.skip("uses status_painting = 'Completed' for battle-ready check in SQL");
  // TODO Plan 29-01: assert SQL string contains "'Completed'" (not 'Complete')
});

describe.skip("useArmyListReadiness hook (PLAY-02)", () => {
  it.skip("maps query rows into Map<id, { total, battleReady }>");
  // TODO Plan 29-01: mock getArmyListReadiness, call hook,
  // assert Map structure

  it.skip("is disabled when ids array is empty (Pitfall 2)");
  // TODO Plan 29-01: call with [], assert enabled: false

  it.skip("sorts ids in query key for stable caching (Pitfall 7)");
  // TODO Plan 29-01: call with [3,1,2], assert query key contains [1,2,3]
});

describe.skip("BattleLogRow readiness display (PLAY-02)", () => {
  it.skip("renders '(battleReady/total pts ready)' when armyListReadiness is provided");
  // TODO Plan 29-03: render BattleLogRow with armyListReadiness={total:200, battleReady:120},
  // assert text "(120/200 pts ready)"

  it.skip("renders tabular-nums class on readiness point values");
  // TODO Plan 29-03: assert span containing pts has "tabular-nums" class

  it.skip("renders no readiness info when armyListReadiness is null");
  // TODO Plan 29-03: render with armyListReadiness=null,
  // assert no "pts ready" text

  it.skip("still renders '(Army list deleted)' when army_list_id is set but armyListName is null");
  // TODO Plan 29-03: render with army_list_id=5, armyListName=null,
  // assert italic "(Army list deleted)"
});
