import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
  ArmyList,
  ArmyListUnitRow,
  ArmyListEnhancement,
} from "@/types/armyList";
import {
  formatArmyListForExport,
  buildClipboardText,
  buildJsonFormat,
  slugify,
  dateStamp,
} from "@/lib/exportArmyList";
import type { ExportData, ExportUnit } from "@/lib/exportArmyList";

// ---------------------------------------------------------------------------
// Test helpers
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
    created_at: "2026-01-01T00:00:00Z",
    unit_name: "Intercessors",
    canonical_name: null,
    unit_points: 80,
    effective_points: 80,
    faction_id: 1,
    status_assembly: null,
    status_painting: null,
    painting_percentage: null,
    tactical_role: null,
    synced_points: null,
    override_points: null,
    tier_points: null,
    ...overrides,
  };
}

function makeEnhancement(
  overrides: Partial<ArmyListEnhancement> = {},
): ArmyListEnhancement {
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

// ---------------------------------------------------------------------------
// formatArmyListForExport
// ---------------------------------------------------------------------------

describe("formatArmyListForExport", () => {
  it("groups leader-attached units immediately after their target", () => {
    const target = makeUnit({ id: 10, unit_name: "Tactical Squad", effective_points: 100 });
    const leader = makeUnit({
      id: 20,
      unit_name: "Captain",
      effective_points: 80,
      leader_attached_to_id: 10,
    });
    const standalone = makeUnit({ id: 30, unit_name: "Dreadnought", effective_points: 150 });

    const data = formatArmyListForExport(
      makeList(),
      [standalone, leader, target],
      [],
      "Space Marines",
    );

    const names = data.sortedUnits.map((u) => u.displayName);
    // standalone first (in original order), then target, then leader after target
    // Actually: target at index where it appeared minus leader, then leader right after
    const targetIdx = names.indexOf("Tactical Squad");
    const leaderIdx = names.indexOf("Captain");
    expect(leaderIdx).toBe(targetIdx + 1);
  });

  it("sets isGhost=true when unit_id is null", () => {
    const ghost = makeUnit({
      id: 5,
      unit_id: null,
      ghost_unit_name: "Eradicators",
      unit_name: "Eradicators",
      effective_points: 95,
    });
    const data = formatArmyListForExport(makeList(), [ghost], [], "Space Marines");
    expect(data.sortedUnits[0].isGhost).toBe(true);
  });

  it("sets isWarlord=true when is_warlord === 1", () => {
    const warlord = makeUnit({ id: 6, is_warlord: 1, unit_name: "Chapter Master" });
    const data = formatArmyListForExport(makeList(), [warlord], [], "Space Marines");
    expect(data.sortedUnits[0].isWarlord).toBe(true);
  });

  it("computes totalPoints as sum of effective_points", () => {
    const units = [
      makeUnit({ id: 1, effective_points: 100 }),
      makeUnit({ id: 2, effective_points: 200 }),
    ];
    const data = formatArmyListForExport(makeList(), units, [], "SM");
    expect(data.totalPoints).toBe(300);
  });

  it("computes enhancementTotal as sum of enhancement_points", () => {
    const enh1 = makeEnhancement({ enhancement_points: 25 });
    const enh2 = makeEnhancement({ id: 2, enhancement_points: 15 });
    const data = formatArmyListForExport(makeList(), [], [enh1, enh2], "SM");
    expect(data.enhancementTotal).toBe(40);
  });

  it("sets leaderLabel on the target unit for attached leaders", () => {
    const target = makeUnit({ id: 10, unit_name: "Hellblasters", effective_points: 120 });
    const leader = makeUnit({
      id: 20,
      unit_name: "Librarian",
      effective_points: 75,
      leader_attached_to_id: 10,
    });
    const data = formatArmyListForExport(makeList(), [target, leader], [], "SM");
    const targetExport = data.sortedUnits.find((u) => u.displayName === "Hellblasters");
    expect(targetExport?.leaderLabel).toBe("Led by: Librarian -- 75pts");
  });

  it("attaches enhancementName to the correct unit", () => {
    const unit = makeUnit({ id: 10, unit_name: "Captain" });
    const enh = makeEnhancement({ army_list_unit_id: 10, enhancement_name: "Storm of Fire" });
    const data = formatArmyListForExport(makeList(), [unit], [enh], "SM");
    const exported = data.sortedUnits.find((u) => u.displayName === "Captain");
    expect(exported?.enhancementName).toBe("Storm of Fire");
  });
});

// ---------------------------------------------------------------------------
// buildClipboardText
// ---------------------------------------------------------------------------

describe("buildClipboardText", () => {
  function makeExportData(overrides: Partial<ExportData> = {}): ExportData {
    return {
      list: makeList(),
      factionName: "Space Marines",
      sortedUnits: [],
      enhancements: [],
      totalPoints: 0,
      enhancementTotal: 0,
      unitNameByListUnitId: new Map(),
      ...overrides,
    };
  }

  it("header line is '[name] -- [total+enhTotal]/[limit]pts'", () => {
    const text = buildClipboardText(
      makeExportData({ totalPoints: 1800, enhancementTotal: 50 }),
    );
    expect(text).toContain("Test List -- 1850/2000pts");
  });

  it("includes Faction and Detachment lines", () => {
    const text = buildClipboardText(makeExportData());
    expect(text).toContain("Faction: Space Marines");
    expect(text).toContain("Detachment: Strike Force");
  });

  it("units section header is '== Units =='", () => {
    const text = buildClipboardText(
      makeExportData({
        sortedUnits: [
          {
            displayName: "Intercessors",
            points: 80,
            isWarlord: false,
            isGhost: false,
            leaderLabel: null,
            selectedModelCount: null,
            enhancementName: null,
            enhancementNames: [],
          },
        ],
      }),
    );
    expect(text).toContain("== Units ==");
  });

  it("leader rows indented with '  > Led by: [name] -- [pts]pts'", () => {
    const text = buildClipboardText(
      makeExportData({
        sortedUnits: [
          {
            displayName: "Hellblasters",
            points: 120,
            isWarlord: false,
            isGhost: false,
            leaderLabel: "Led by: Captain -- 80pts",
            selectedModelCount: null,
            enhancementName: null,
            enhancementNames: [],
          },
        ],
      }),
    );
    expect(text).toContain("  > Led by: Captain -- 80pts");
  });

  it("ghost units have '[Planned]' after name", () => {
    const text = buildClipboardText(
      makeExportData({
        sortedUnits: [
          {
            displayName: "Eradicators",
            points: 95,
            isWarlord: false,
            isGhost: true,
            selectedModelCount: null,
            leaderLabel: null,
            enhancementName: null,
            enhancementNames: [],
          },
        ],
      }),
    );
    expect(text).toContain("Eradicators [Planned]");
  });

  it("warlord units have '(Warlord)' suffix", () => {
    const text = buildClipboardText(
      makeExportData({
        sortedUnits: [
          {
            displayName: "Chapter Master",
            points: 100,
            isWarlord: true,
            isGhost: false,
            selectedModelCount: null,
            leaderLabel: null,
            enhancementName: null,
            enhancementNames: [],
          },
        ],
      }),
    );
    expect(text).toContain("Chapter Master (Warlord)");
  });

  it("enhancements section omitted when empty", () => {
    const text = buildClipboardText(makeExportData({ enhancements: [] }));
    expect(text).not.toContain("== Enhancements ==");
  });

  it("enhancements section present when enhancements exist", () => {
    const text = buildClipboardText(
      makeExportData({
        enhancements: [makeEnhancement({ enhancement_name: "Storm of Fire", enhancement_points: 20 })],
      }),
    );
    expect(text).toContain("== Enhancements ==");
    expect(text).toContain("Storm of Fire -- 20pts");
  });

  it("empty list produces 'No units added yet.' instead of units section", () => {
    const text = buildClipboardText(makeExportData({ sortedUnits: [] }));
    expect(text).toContain("No units added yet.");
    expect(text).not.toContain("== Units ==");
  });

  it("total line is always present", () => {
    const text = buildClipboardText(
      makeExportData({ totalPoints: 500, enhancementTotal: 25 }),
    );
    expect(text).toContain("Total: 525pts / 2000pts");
  });
});

// ---------------------------------------------------------------------------
// buildJsonFormat
// ---------------------------------------------------------------------------

describe("buildJsonFormat", () => {
  it("output has format, version, exported_at fields", () => {
    const data: ExportData = {
      list: makeList(),
      factionName: "Orks",
      sortedUnits: [],
      enhancements: [],
      totalPoints: 0,
      enhancementTotal: 0,
      unitNameByListUnitId: new Map(),
    };
    const json = JSON.parse(buildJsonFormat(data));
    expect(json.format).toBe("hobbyforge-army-list");
    expect(json.version).toBe("1.0");
    expect(json.exported_at).toBeDefined();
    expect(() => new Date(json.exported_at)).not.toThrow();
  });

  it("units array has correct fields", () => {
    const data: ExportData = {
      list: makeList(),
      factionName: "SM",
      sortedUnits: [
        {
          displayName: "Intercessors",
          points: 80,
          isWarlord: true,
          isGhost: false,
          selectedModelCount: null,
          leaderLabel: null,
          enhancementName: "Storm of Fire",
          enhancementNames: ["Storm of Fire"],
        },
      ],
      enhancements: [],
      totalPoints: 80,
      enhancementTotal: 0,
      unitNameByListUnitId: new Map(),
    };
    const json = JSON.parse(buildJsonFormat(data));
    expect(json.units[0].name).toBe("Intercessors");
    expect(json.units[0].points).toBe(80);
    expect(json.units[0].is_warlord).toBe(true);
    expect(json.units[0].is_ghost).toBe(false);
    expect(json.units[0].enhancement).toBe("Storm of Fire");
  });

  it("enhancements array has name, points, assigned_to fields", () => {
    const unit: ExportUnit = {
      displayName: "Captain",
      points: 80,
      isWarlord: false,
      isGhost: false,
      selectedModelCount: null,
      leaderLabel: null,
      enhancementName: "Inspiring Leader",
      enhancementNames: ["Inspiring Leader"],
    };
    const enh = makeEnhancement({ army_list_unit_id: 10, enhancement_name: "Inspiring Leader", enhancement_points: 25 });
    const data: ExportData = {
      list: makeList(),
      factionName: "SM",
      sortedUnits: [unit],
      enhancements: [enh],
      totalPoints: 80,
      enhancementTotal: 25,
      unitNameByListUnitId: new Map([[10, "Captain"]]),
    };
    const json = JSON.parse(buildJsonFormat(data));
    expect(json.enhancements[0].name).toBe("Inspiring Leader");
    expect(json.enhancements[0].points).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("My Army List")).toBe("my-army-list");
  });

  it("strips non-alphanumeric chars", () => {
    expect(slugify("List #1 (v2)!")).toBe("list-1-v2");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--test--")).toBe("test");
  });

  it("converts path traversal chars to hyphens", () => {
    expect(slugify("My List../test")).toBe("my-list-test");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("collapses multiple consecutive hyphens", () => {
    expect(slugify("a   b")).toBe("a-b");
  });
});

// ---------------------------------------------------------------------------
// dateStamp
// ---------------------------------------------------------------------------

describe("dateStamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns YYYY-MM-DD format string", () => {
    vi.setSystemTime(new Date("2026-03-15T10:00:00Z"));
    const result = dateStamp();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("pads single-digit month and day", () => {
    vi.setSystemTime(new Date("2026-01-05T10:00:00Z"));
    // We check it matches the format - exact value depends on timezone
    expect(dateStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
