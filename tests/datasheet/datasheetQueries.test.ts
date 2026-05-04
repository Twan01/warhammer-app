/**
 * Phase 15 — datasheets query module tests.
 *
 * Mocks BOTH @/db/client (hobbyforge.db) AND @/db/rules-client (rules.db) because
 * the query module spans both connections. Mirrors tests/foundation/strategyNoteQueries.test.ts
 * pattern with two mock pairs.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const hobbyforgeSelectMock = vi.fn();
const hobbyforgeExecuteMock = vi.fn();
const rulesSelectMock = vi.fn();
const rulesExecuteMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: hobbyforgeSelectMock, execute: hobbyforgeExecuteMock }),
}));

vi.mock("@/db/rules-client", () => ({
  getRulesDb: async () => ({ select: rulesSelectMock, execute: rulesExecuteMock }),
}));

// Import AFTER vi.mock so the mocked clients are used.
import {
  getDatasheetsByFaction,
  getFullDatasheet,
  getRulesSyncMeta,
  upsertDatasheetLink,
} from "@/db/queries/datasheets";

beforeEach(() => {
  hobbyforgeSelectMock.mockReset();
  hobbyforgeExecuteMock.mockReset();
  rulesSelectMock.mockReset();
  rulesExecuteMock.mockReset();
});

describe("datasheets queries", () => {
  it("DS-04: getDatasheetsByFaction issues SELECT id, name, role FROM rw_datasheets WHERE faction_id = $1 ORDER BY name ASC against rules.db", async () => {
    rulesSelectMock.mockResolvedValueOnce([
      { id: "001", name: "Intercessors", role: "Battleline" },
    ]);
    const rows = await getDatasheetsByFaction("SM");
    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT id, name, role FROM rw_datasheets WHERE faction_id = $1 ORDER BY name ASC",
      ["SM"]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("Intercessors");
  });

  it("DS-07: getFullDatasheet returns null when datasheet ID does not exist; otherwise returns ds + models + abilities + keywords + source (with HTML stripped)", async () => {
    // Case 1: not found
    rulesSelectMock.mockResolvedValueOnce([]); // ds query returns no rows
    expect(await getFullDatasheet("missing")).toBeNull();

    // Case 2: full payload (5 sequential select calls: ds, models, abilities, keywords, source)
    rulesSelectMock
      .mockResolvedValueOnce([{
        id: "001", name: "Intercessors", faction_id: "SM",
        source_id: "src1", role: "Battleline", damaged_w: null, damaged_description: null,
      }])
      .mockResolvedValueOnce([{ datasheet_id: "001", line: 1, name: "Intercessor", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }])
      .mockResolvedValueOnce([{ datasheet_id: "001", line: 1, ability_id: "a1", name: "Bolter Discipline", description: "<b>Sustained Hits 1</b>", type: "Datasheet", parameter: null }])
      .mockResolvedValueOnce([{ datasheet_id: "001", keyword: "Infantry", is_faction_keyword: 0 }])
      .mockResolvedValueOnce([{ id: "src1", name: "Codex: Space Marines", type: "Codex", edition: 10, version: "1.0", errata_date: null }]);

    const result = await getFullDatasheet("001");
    expect(result).not.toBeNull();
    expect(result!.ds.name).toBe("Intercessors");
    expect(result!.models.length).toBe(1);
    expect(result!.abilities.length).toBe(1);
    // stripHtml applied to description
    expect(result!.abilities[0].description).toBe("Sustained Hits 1");
    expect(result!.keywords.length).toBe(1);
    expect(result!.source?.name).toBe("Codex: Space Marines");

    // Verify the abilities query SQL excludes Wargear/Wargear profile/Fortification rows
    const abilityCall = rulesSelectMock.mock.calls.find((call) =>
      typeof call[0] === "string" && call[0].includes("rw_datasheet_abilities")
    );
    expect(abilityCall).toBeDefined();
    expect(abilityCall![0]).toMatch(/type NOT IN \('Wargear', 'Wargear profile', 'Fortification \(.+\)'\)/);
  });

  it("DS-02 + DS-03: getRulesSyncMeta returns null when rules.db throws (empty/uninitialized); otherwise returns the single rw_sync_meta row", async () => {
    // Case 1: schema not yet present → throws → catch returns null
    rulesSelectMock.mockRejectedValueOnce(new Error("no such table: rw_sync_meta"));
    expect(await getRulesSyncMeta()).toBeNull();

    // Case 2: row present
    rulesSelectMock.mockResolvedValueOnce([
      { id: 1, last_sync_at: "2026-05-04T12:00:00Z", wahapedia_version: "2026-04-27 20:55:42" },
    ]);
    const meta = await getRulesSyncMeta();
    expect(meta?.last_sync_at).toBe("2026-05-04T12:00:00Z");
    expect(meta?.wahapedia_version).toBe("2026-04-27 20:55:42");

    // Case 3: query succeeded but rw_sync_meta is empty
    rulesSelectMock.mockResolvedValueOnce([]);
    expect(await getRulesSyncMeta()).toBeNull();
  });

  it("DS-06: upsertDatasheetLink writes datasheet_id to unit_strategy_notes in hobbyforge.db (NOT rules.db); creates row when no strategy note exists, updates row when one exists", async () => {
    // Case 1: no existing strategy_notes row → INSERT
    hobbyforgeSelectMock.mockResolvedValueOnce([]);
    await upsertDatasheetLink({ unit_id: 7, datasheet_id: "000000882" });
    expect(hobbyforgeSelectMock).toHaveBeenCalledWith(
      "SELECT id FROM unit_strategy_notes WHERE unit_id = $1",
      [7]
    );
    expect(hobbyforgeExecuteMock).toHaveBeenCalledWith(
      "INSERT INTO unit_strategy_notes (unit_id, datasheet_id) VALUES ($1, $2)",
      [7, "000000882"]
    );

    // Case 2: existing row → UPDATE
    hobbyforgeSelectMock.mockReset();
    hobbyforgeExecuteMock.mockReset();
    hobbyforgeSelectMock.mockResolvedValueOnce([{ id: 1 }]);
    await upsertDatasheetLink({ unit_id: 7, datasheet_id: "000000999" });
    const updateCall = hobbyforgeExecuteMock.mock.calls[0];
    expect(updateCall[0]).toMatch(/UPDATE unit_strategy_notes SET datasheet_id = \$2, updated_at = datetime\('now'\) WHERE unit_id = \$1/);
    expect(updateCall[1]).toEqual([7, "000000999"]);

    // Verify it wrote to hobbyforge.db (NOT rules.db)
    expect(rulesExecuteMock).not.toHaveBeenCalled();
  });
});
