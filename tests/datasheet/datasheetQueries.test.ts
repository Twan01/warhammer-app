/**
 * Phase 15 — datasheets query module tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-03 will:
 *   1. Create src/db/queries/datasheets.ts exporting getDatasheetsByFaction, getFullDatasheet,
 *      getRulesSyncMeta, upsertDatasheetLink (writes to hobbyforge.db unit_strategy_notes).
 *   2. Create src/db/rules-client.ts exporting getRulesDb singleton.
 *   3. Create src/types/datasheet.ts exporting RwFaction, RwDatasheet, RwDatasheetModel,
 *      RwDatasheetAbility, RwDatasheetKeyword, RwSource, RulesSyncMeta, FullDatasheet,
 *      DatasheetSummary types.
 *   4. Replace each `it.skip` below with `it`.
 *   5. Add real assertions matching 15-VALIDATION.md row 15-02-01.
 *
 * Mirrors tests/foundation/strategyNoteQueries.test.ts vi.mock("@/db/client") pattern,
 * plus a parallel vi.mock("@/db/rules-client") for the second DB connection.
 */
import { describe, it } from "vitest";

describe("datasheets queries — Wave 0 stubs", () => {
  it.skip("DS-04: getDatasheetsByFaction issues SELECT id, name, role FROM rw_datasheets WHERE faction_id = $1 ORDER BY name ASC against rules.db", () => {
    // Plan 15-03 will:
    //   - vi.mock("@/db/rules-client") with selectMock/executeMock
    //   - selectMock.mockResolvedValueOnce([{ id: "001", name: "Intercessors", role: "Battleline" }])
    //   - import { getDatasheetsByFaction } from "@/db/queries/datasheets"
    //   - const rows = await getDatasheetsByFaction("SM")
    //   - assert selectMock called with /SELECT id, name, role FROM rw_datasheets WHERE faction_id = \$1 ORDER BY name ASC/
    //   - assert second arg equals ["SM"]
    //   - assert rows.length === 1 && rows[0].name === "Intercessors"
  });

  it.skip("DS-07: getFullDatasheet returns null when datasheet ID does not exist; otherwise returns ds + models + abilities + keywords + source", () => {
    // Plan 15-03 will:
    //   - selectMock.mockResolvedValueOnce([])  // ds query returns no rows
    //   - import { getFullDatasheet } from "@/db/queries/datasheets"
    //   - assert (await getFullDatasheet("missing")) === null
    //   - reset; selectMock returns rows for ds, models, abilities, keywords, source in 5 sequential calls
    //   - assert returned object has shape { ds, models, abilities, keywords, source }
    //   - assert abilities query SQL excludes Wargear types: /type NOT IN \('Wargear', 'Wargear profile', 'Fortification \(.+\)'\)/
  });

  it.skip("DS-02 + DS-03: getRulesSyncMeta returns null when rules.db is empty/uninitialized; otherwise returns the single rw_sync_meta row", () => {
    // Plan 15-03 will:
    //   - selectMock.mockRejectedValueOnce(new Error("no such table: rw_sync_meta"))
    //   - import { getRulesSyncMeta } from "@/db/queries/datasheets"
    //   - assert (await getRulesSyncMeta()) === null  (try/catch returns null on schema-missing error)
    //   - reset; selectMock.mockResolvedValueOnce([{ id: 1, last_sync_at: "2026-05-04T12:00:00Z", wahapedia_version: "2026-04-27 20:55:42" }])
    //   - const meta = await getRulesSyncMeta()
    //   - assert meta?.last_sync_at === "2026-05-04T12:00:00Z"
  });

  it.skip("DS-06: upsertDatasheetLink writes datasheet_id to unit_strategy_notes in hobbyforge.db (NOT rules.db); creates row if no strategy note exists yet", () => {
    // Plan 15-03 will:
    //   - vi.mock("@/db/client") (hobbyforge.db, NOT rules-client)
    //   - selectMock.mockResolvedValueOnce([])  // no existing strategy_notes row for unit
    //   - import { upsertDatasheetLink } from "@/db/queries/datasheets"
    //   - await upsertDatasheetLink({ unit_id: 7, datasheet_id: "000000882" })
    //   - assert executeMock called with INSERT INTO unit_strategy_notes (unit_id, datasheet_id) VALUES ($1, $2)
    //   - reset; selectMock.mockResolvedValueOnce([{ id: 1 }])  // existing row
    //   - assert executeMock called with UPDATE unit_strategy_notes SET datasheet_id=$2 WHERE unit_id=$1
  });
});
