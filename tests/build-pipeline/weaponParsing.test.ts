// @vitest-environment node
/**
 * Weapon CSV column mapping tests (PFX-01).
 *
 * Tests the correct behavior for mapping Datasheets_wargear.csv rows
 * to UdbUnitWeaponRow fields. Covers three bug classes:
 *   1. weapon.range must read CSV "range" (lowercase), not "Range"
 *   2. weapon.keywords must read CSV "description", not "keywords"
 *   3. weapon_group = CSV "line", line_order = CSV "line_in_wargear"
 */
import { describe, it, expect } from "vitest";
import { mapWeaponRow } from "../../scripts/lib/weaponMapping.ts";

/** Helper: build a mock CSV row matching Datasheets_wargear.csv headers */
function mockWargearRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    datasheet_id: "000000001",
    line: "1",
    line_in_wargear: "1",
    dice: "",
    name: "Bolt Rifle",
    description: "rapid fire 1",
    range: "24",
    type: "Ranged",
    A: "2",
    BS_WS: "3",
    S: "4",
    AP: "-1",
    D: "1",
    ...overrides,
  };
}

describe("Weapon CSV column mapping: PFX-01", () => {
  it("extracts range from row['range'] (lowercase CSV header)", () => {
    const row = mockWargearRow({ range: "24" });
    const result = mapWeaponRow(row);
    expect(result.range).toBe("24");
  });

  it("extracts keywords from row['description'] (not row['keywords'])", () => {
    const row = mockWargearRow({
      description: "anti-infantry 4+, devastating wounds",
    });
    const result = mapWeaponRow(row);
    expect(result.keywords).toBe("anti-infantry 4+, devastating wounds");
  });

  it("sets weapon_group from CSV 'line' column directly", () => {
    const row = mockWargearRow({ line: "3" });
    const result = mapWeaponRow(row);
    expect(result.weapon_group).toBe(3);
  });

  it("sets line_order from CSV 'line_in_wargear' column directly", () => {
    const row = mockWargearRow({ line: "2", line_in_wargear: "2" });
    const result = mapWeaponRow(row);
    expect(result.line_order).toBe(2);
  });

  it("multi-weapon unit produces correct weapon_group and line_order (Imotekh example)", () => {
    // Imotekh (unit 000000522): 3 weapons across 3 groups, each with line_in_wargear=1
    const rows = [
      mockWargearRow({
        datasheet_id: "000000522",
        line: "1",
        line_in_wargear: "1",
        name: "Gauntlet of Fire",
        range: "12",
        type: "Ranged",
      }),
      mockWargearRow({
        datasheet_id: "000000522",
        line: "2",
        line_in_wargear: "1",
        name: "Staff of the Destroyer",
        range: "18",
        type: "Ranged",
      }),
      mockWargearRow({
        datasheet_id: "000000522",
        line: "3",
        line_in_wargear: "1",
        name: "Staff of the Destroyer",
        range: "Melee",
        type: "Melee",
      }),
    ];

    const results = rows.map(mapWeaponRow);

    // weapon_group should be 1, 2, 3 (from CSV "line")
    expect(results[0].weapon_group).toBe(1);
    expect(results[1].weapon_group).toBe(2);
    expect(results[2].weapon_group).toBe(3);

    // line_order should be 1, 1, 1 (from CSV "line_in_wargear")
    expect(results[0].line_order).toBe(1);
    expect(results[1].line_order).toBe(1);
    expect(results[2].line_order).toBe(1);

    // range and keywords should be populated
    expect(results[0].range).toBe("12");
    expect(results[1].range).toBe("18");
    expect(results[2].range).toBe("Melee");
  });

  it("handles supercharge variant with line_in_wargear=2", () => {
    const rows = [
      mockWargearRow({
        line: "1",
        line_in_wargear: "1",
        name: "Plasma Incinerator",
        description: "heavy",
      }),
      mockWargearRow({
        line: "1",
        line_in_wargear: "2",
        name: "Plasma Incinerator - supercharge",
        description: "hazardous, heavy",
      }),
    ];

    const results = rows.map(mapWeaponRow);

    // Both in same weapon_group (line=1), different line_order
    expect(results[0].weapon_group).toBe(1);
    expect(results[1].weapon_group).toBe(1);
    expect(results[0].line_order).toBe(1);
    expect(results[1].line_order).toBe(2);

    // keywords from description
    expect(results[0].keywords).toBe("heavy");
    expect(results[1].keywords).toBe("hazardous, heavy");
  });
});
