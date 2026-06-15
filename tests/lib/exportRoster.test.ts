import { describe, expect, it, vi } from "vitest";
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";
import type { UdbStratagem, UdbDetachmentAbility } from "@/types/gameData";
import type { ExportData } from "@/lib/exportArmyList";
import { assembleRoster } from "@/lib/exportRoster";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeList(overrides: Partial<ArmyList> = {}): ArmyList {
  return {
    id: 1,
    name: "Test List",
    faction_id: 1,
    points_limit: 2000,
    list_type: "matched",
    notes: null,
    detachment_id: "det-1",
    detachment_name: "Strike Force",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 100,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    unit_name: "Intercessors",
    unit_points: 80,
    udb_unit_id: "sm-intercessors",
    effective_points: 80,
    faction_id: 1,
    unit_category: "Battleline",
    unit_model_count: null,
    status_assembly: null,
    status_painting: null,
    painting_percentage: null,
    tactical_role: null,
    udb_base_points: null,
    udb_role: null,
    udb_keywords: null,
    override_points: null,
    tier_points: null,
    ...overrides,
  };
}

function makeEnhancement(overrides: Partial<ArmyListEnhancement> = {}): ArmyListEnhancement {
  return {
    id: 1,
    list_id: 1,
    army_list_unit_id: 1,
    enhancement_name: "Inspiring Leader",
    enhancement_points: 25,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDetail(id: string, name: string): UdbUnitDetail {
  return {
    id,
    faction_id: "SM",
    name,
    role: "Battleline",
    base_points: 80,
    damaged_w: null,
    damaged_desc: null,
    models: [],
    weapons: [],
    abilities: [],
    keywords: [],
    points: [],
    composition: [],
  };
}

function makeStrategy(overrides: Partial<UdbStratagem> = {}): UdbStratagem {
  return {
    id: "strat-1",
    faction_id: "SM",
    detachment_id: "det-1",
    name: "Rapid Fire",
    type: "Battle Tactic",
    cp_cost: 1,
    turn: "Either",
    phase: "Shooting",
    description: "Fire more shots.",
    ...overrides,
  } as UdbStratagem & { id: string };
}

function makeDetachmentAbility(overrides: Partial<UdbDetachmentAbility> = {}): UdbDetachmentAbility {
  return {
    id: "da-1",
    detachment_id: "det-1",
    name: "Strike Force Rule",
    description: "Re-roll ones.",
    ...overrides,
  } as UdbDetachmentAbility & { id: string };
}

function makeSummary(list: ArmyList): ExportData {
  return {
    list,
    factionName: "Space Marines",
    sortedUnits: [],
    enhancements: [],
    totalPoints: 0,
    enhancementTotal: 0,
    unitNameByListUnitId: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("assembleRoster", () => {
  it("dedupes two units with the same udb_unit_id into one datasheet with count=2", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 1, udb_unit_id: "sm-intercessors", effective_points: 80 }),
      makeUnit({ id: 2, udb_unit_id: "sm-intercessors", effective_points: 80 }),
    ];
    const detail = makeDetail("sm-intercessors", "Intercessors");
    const mockGetDetail = vi.fn().mockResolvedValue(detail);

    const roster = await assembleRoster({
      list,
      units,
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: mockGetDetail,
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.datasheets).toHaveLength(1);
    expect(roster.datasheets[0].count).toBe(2);
    expect(roster.datasheets[0].displayName).toBe("Intercessors");
  });

  it("calls getUdbUnitDetail exactly once per distinct udb_unit_id", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 1, udb_unit_id: "sm-intercessors", effective_points: 80 }),
      makeUnit({ id: 2, udb_unit_id: "sm-intercessors", effective_points: 80 }),
      makeUnit({ id: 3, udb_unit_id: "sm-captain", unit_name: "Captain", effective_points: 90 }),
    ];
    const mockGetDetail = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(makeDetail(id, id))
    );

    await assembleRoster({
      list,
      units,
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: mockGetDetail,
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(mockGetDetail).toHaveBeenCalledTimes(2);
    expect(mockGetDetail).toHaveBeenCalledWith("sm-intercessors", "en");
    expect(mockGetDetail).toHaveBeenCalledWith("sm-captain", "en");
  });

  it("distinct udb_unit_ids produce separate datasheet entries", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 1, udb_unit_id: "unit-a", unit_name: "Unit A", effective_points: 80 }),
      makeUnit({ id: 2, udb_unit_id: "unit-b", unit_name: "Unit B", effective_points: 100 }),
    ];
    const mockGetDetail = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(makeDetail(id, id))
    );

    const roster = await assembleRoster({
      list,
      units,
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: mockGetDetail,
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.datasheets).toHaveLength(2);
  });

  it("ghost unit (udb_unit_id null) produces entry with detail=null and isGhost=true", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 1, udb_unit_id: null, unit_id: null, unit_name: "Ghost Squad", effective_points: 70 }),
    ];
    const mockGetDetail = vi.fn().mockResolvedValue(null);

    const roster = await assembleRoster({
      list,
      units,
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: mockGetDetail,
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.datasheets).toHaveLength(1);
    expect(roster.datasheets[0].isGhost).toBe(true);
    expect(roster.datasheets[0].detail).toBeNull();
    expect(roster.datasheets[0].displayName).toBe("Ghost Squad");
    // getUdbUnitDetail should NOT be called for ghost units
    expect(mockGetDetail).not.toHaveBeenCalled();
  });

  it("unit whose getUdbUnitDetail resolves null has detail=null (not dropped)", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 1, udb_unit_id: "unknown-unit", unit_name: "Mystery Unit", effective_points: 50 }),
    ];
    const mockGetDetail = vi.fn().mockResolvedValue(null);

    const roster = await assembleRoster({
      list,
      units,
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: mockGetDetail,
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.datasheets).toHaveLength(1);
    expect(roster.datasheets[0].detail).toBeNull();
    expect(roster.datasheets[0].isGhost).toBe(false);
  });

  it("maps enhancements to correct unit name via army_list_unit_id", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 10, unit_name: "Captain", udb_unit_id: "sm-captain", effective_points: 90 }),
    ];
    const enhancements = [
      makeEnhancement({ army_list_unit_id: 10, enhancement_name: "Storm of Fire", enhancement_points: 20 }),
    ];
    const mockGetDetail = vi.fn().mockResolvedValue(makeDetail("sm-captain", "Captain"));

    const roster = await assembleRoster({
      list,
      units,
      enhancements,
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: mockGetDetail,
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.detachment?.enhancements).toHaveLength(1);
    expect(roster.detachment?.enhancements[0].name).toBe("Storm of Fire");
    expect(roster.detachment?.enhancements[0].points).toBe(20);
    expect(roster.detachment?.enhancements[0].onUnit).toBe("Captain");
  });

  it("detachment present: section has detachmentName, abilities, stratagems", async () => {
    const list = makeList({ detachment_id: "det-1", detachment_name: "Strike Force" });
    const mockGetStratagems = vi.fn().mockResolvedValue([makeStrategy()]);
    const mockGetAbilities = vi.fn().mockResolvedValue([makeDetachmentAbility()]);

    const roster = await assembleRoster({
      list,
      units: [],
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: vi.fn().mockResolvedValue(null),
        getStratagemsByDetachment: mockGetStratagems,
        getDetachmentAbilitiesByDetachment: mockGetAbilities,
      },
    });

    expect(roster.detachment).not.toBeNull();
    expect(roster.detachment?.detachmentName).toBe("Strike Force");
    expect(roster.detachment?.stratagems).toHaveLength(1);
    expect(roster.detachment?.abilities).toHaveLength(1);
    expect(mockGetStratagems).toHaveBeenCalledWith("det-1");
    expect(mockGetAbilities).toHaveBeenCalledWith("det-1");
  });

  it("detachment absent (null): detachment section is null and queries not called", async () => {
    const list = makeList({ detachment_id: null, detachment_name: null });
    const mockGetStratagems = vi.fn();
    const mockGetAbilities = vi.fn();

    const roster = await assembleRoster({
      list,
      units: [],
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: vi.fn().mockResolvedValue(null),
        getStratagemsByDetachment: mockGetStratagems,
        getDetachmentAbilitiesByDetachment: mockGetAbilities,
      },
    });

    expect(roster.detachment).toBeNull();
    expect(mockGetStratagems).not.toHaveBeenCalled();
    expect(mockGetAbilities).not.toHaveBeenCalled();
  });

  it("multiple ghost units with same name dedupe to count=2", async () => {
    const list = makeList();
    const units = [
      makeUnit({ id: 1, udb_unit_id: null, unit_id: null, unit_name: "Planned Unit", effective_points: 70 }),
      makeUnit({ id: 2, udb_unit_id: null, unit_id: null, unit_name: "Planned Unit", effective_points: 70 }),
    ];

    const roster = await assembleRoster({
      list,
      units,
      enhancements: [],
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: vi.fn().mockResolvedValue(null),
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.datasheets).toHaveLength(1);
    expect(roster.datasheets[0].count).toBe(2);
    expect(roster.datasheets[0].isGhost).toBe(true);
  });

  it("summary passthrough: returned roster.summary is the provided ExportData", async () => {
    const list = makeList();
    const summary = makeSummary(list);

    const roster = await assembleRoster({
      list,
      units: [],
      enhancements: [],
      summary,
      locale: "en",
      deps: {
        getUdbUnitDetail: vi.fn().mockResolvedValue(null),
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.summary).toBe(summary);
  });

  it("enhancement with unknown army_list_unit_id falls back to '—'", async () => {
    const list = makeList();
    const enhancements = [
      makeEnhancement({ army_list_unit_id: 999, enhancement_name: "Unknown Enhancement", enhancement_points: 15 }),
    ];

    const roster = await assembleRoster({
      list,
      units: [],
      enhancements,
      summary: makeSummary(list),
      locale: "en",
      deps: {
        getUdbUnitDetail: vi.fn().mockResolvedValue(null),
        getStratagemsByDetachment: vi.fn().mockResolvedValue([]),
        getDetachmentAbilitiesByDetachment: vi.fn().mockResolvedValue([]),
      },
    });

    expect(roster.detachment?.enhancements[0].onUnit).toBe("—");
  });
});
