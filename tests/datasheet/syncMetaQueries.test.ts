/**
 * Phase 45 — getRulesSyncMeta query tests (META-01, META-02, META-03).
 *
 * Mocks @/db/rules-client following the syncErrorQueries.test.ts pattern.
 * rw_sync_meta lives in rules.db — access via getRulesDb().
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();

vi.mock("@/db/rules-client", () => ({
  getRulesDb: async () => ({ select: selectMock }),
}));

import { getRulesSyncMeta } from "@/db/queries/datasheets";

beforeEach(() => {
  selectMock.mockReset();
});

describe("getRulesSyncMeta", () => {
  it("META-01 + META-02 + META-03: returns full RulesSyncMeta row with all 11 count fields", async () => {
    const mockRow = {
      id: 1,
      last_sync_at: "2026-05-08T14:32:00.000Z",
      wahapedia_version: "v2.5",
      factions_count: 10,
      sources_count: 5,
      datasheets_count: 300,
      models_count: 1200,
      abilities_count: 450,
      keywords_count: 600,
      wargear_count: 250,
      shared_abilities_count: 90,
      stratagems_count: 80,
      detachments_count: 30,
      detachment_abilities_count: 70,
    };
    selectMock.mockResolvedValue([mockRow]);

    const result = await getRulesSyncMeta();

    expect(selectMock).toHaveBeenCalledOnce();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("SELECT *");
    expect(sql).toContain("rw_sync_meta");

    // META-01: sync date field present
    expect(result?.last_sync_at).toBe("2026-05-08T14:32:00.000Z");

    // META-03: wahapedia_version field present
    expect(result?.wahapedia_version).toBe("v2.5");

    // META-02: all 11 per-table row count fields present with correct values
    expect(result?.factions_count).toBe(10);
    expect(result?.sources_count).toBe(5);
    expect(result?.datasheets_count).toBe(300);
    expect(result?.models_count).toBe(1200);
    expect(result?.abilities_count).toBe(450);
    expect(result?.keywords_count).toBe(600);
    expect(result?.wargear_count).toBe(250);
    expect(result?.shared_abilities_count).toBe(90);
    expect(result?.stratagems_count).toBe(80);
    expect(result?.detachments_count).toBe(30);
    expect(result?.detachment_abilities_count).toBe(70);
  });

  it("META-02: handles null count fields (pre-migration state — all counts null)", async () => {
    const mockRow = {
      id: 1,
      last_sync_at: "2026-04-01T10:00:00.000Z",
      wahapedia_version: "v1.0",
      factions_count: null,
      sources_count: null,
      datasheets_count: null,
      models_count: null,
      abilities_count: null,
      keywords_count: null,
      wargear_count: null,
      shared_abilities_count: null,
      stratagems_count: null,
      detachments_count: null,
      detachment_abilities_count: null,
    };
    selectMock.mockResolvedValue([mockRow]);

    const result = await getRulesSyncMeta();

    expect(result).not.toBeNull();
    // All 11 counts should be null
    expect(result?.factions_count).toBeNull();
    expect(result?.sources_count).toBeNull();
    expect(result?.datasheets_count).toBeNull();
    expect(result?.models_count).toBeNull();
    expect(result?.abilities_count).toBeNull();
    expect(result?.keywords_count).toBeNull();
    expect(result?.wargear_count).toBeNull();
    expect(result?.shared_abilities_count).toBeNull();
    expect(result?.stratagems_count).toBeNull();
    expect(result?.detachments_count).toBeNull();
    expect(result?.detachment_abilities_count).toBeNull();
  });

  it("META-03: returns wahapedia_version field from SELECT *", async () => {
    selectMock.mockResolvedValue([
      {
        id: 1,
        last_sync_at: "2026-05-08T14:32:00.000Z",
        wahapedia_version: "20260501",
        factions_count: null,
        sources_count: null,
        datasheets_count: null,
        models_count: null,
        abilities_count: null,
        keywords_count: null,
        wargear_count: null,
        shared_abilities_count: null,
        stratagems_count: null,
        detachments_count: null,
        detachment_abilities_count: null,
      },
    ]);

    const result = await getRulesSyncMeta();

    expect(result?.wahapedia_version).toBe("20260501");
  });

  it("returns null when rw_sync_meta is empty (rules.db not yet synced)", async () => {
    selectMock.mockResolvedValue([]);

    const result = await getRulesSyncMeta();

    expect(result).toBeNull();
  });

  it("returns null when getRulesDb throws (rules.db not initialized)", async () => {
    // Simulate "no such table" error — getRulesSyncMeta wraps in try/catch
    selectMock.mockRejectedValue(new Error("no such table: rw_sync_meta"));

    const result = await getRulesSyncMeta();

    expect(result).toBeNull();
  });
});
