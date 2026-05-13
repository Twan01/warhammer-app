import { describe, expect, it } from "vitest";
import {
  TACTICAL_ROLES,
  TACTICAL_ROLES_DISPLAY,
} from "@/types/armyList";
import type { TacticalRole, ArmyListUnitRow, UpdateArmyListUnitInput } from "@/types/armyList";

describe("TACTICAL_ROLES", () => {
  it("has exactly 7 entries", () => {
    expect(TACTICAL_ROLES).toHaveLength(7);
  });

  it("includes all expected roles", () => {
    expect(TACTICAL_ROLES).toContain("anti_tank");
    expect(TACTICAL_ROLES).toContain("screening");
    expect(TACTICAL_ROLES).toContain("objective_holder");
    expect(TACTICAL_ROLES).toContain("fire_support");
    expect(TACTICAL_ROLES).toContain("melee_threat");
    expect(TACTICAL_ROLES).toContain("utility");
    expect(TACTICAL_ROLES).toContain("transport");
  });

  it("TacticalRole type accepts valid roles", () => {
    const role: TacticalRole = "anti_tank";
    expect(TACTICAL_ROLES).toContain(role);
  });
});

describe("TACTICAL_ROLES_DISPLAY", () => {
  it("maps anti_tank to Anti-Tank", () => {
    expect(TACTICAL_ROLES_DISPLAY["anti_tank"]).toBe("Anti-Tank");
  });

  it("maps objective_holder to Obj. Holder", () => {
    expect(TACTICAL_ROLES_DISPLAY["objective_holder"]).toBe("Obj. Holder");
  });

  it("maps all 7 roles to display labels", () => {
    for (const role of TACTICAL_ROLES) {
      expect(TACTICAL_ROLES_DISPLAY[role]).toBeDefined();
      expect(typeof TACTICAL_ROLES_DISPLAY[role]).toBe("string");
    }
  });
});

describe("ArmyListUnitRow type", () => {
  it("accepts tactical_role as string or null", () => {
    const row = {
      id: 1,
      list_id: 1,
      unit_id: 1,
      points_override: null,
      notes: null,
      created_at: "2024-01-01",
      unit_name: "Intercessors",
      unit_points: 100,
      effective_points: 100,
      faction_id: 1,
      status_assembly: 1,
      status_painting: "Completed",
      painting_percentage: 100,
      tactical_role: "anti_tank",
    } satisfies ArmyListUnitRow;
    expect(row.tactical_role).toBe("anti_tank");

    const rowNull = { ...row, tactical_role: null } satisfies ArmyListUnitRow;
    expect(rowNull.tactical_role).toBeNull();
  });
});

describe("UpdateArmyListUnitInput type", () => {
  it("accepts tactical_role as string or null", () => {
    const input = {
      id: 1,
      points_override: null,
      notes: null,
      tactical_role: "screening",
    } satisfies UpdateArmyListUnitInput;
    expect(input.tactical_role).toBe("screening");

    const inputNull = { ...input, tactical_role: null } satisfies UpdateArmyListUnitInput;
    expect(inputNull.tactical_role).toBeNull();
  });
});
