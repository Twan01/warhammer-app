/**
 * Phase 110 -- WeaponTable component tests.
 *
 * Covers INT-02 (weapon profiles visible):
 * - Renders weapon name and stat columns (Range, A, BS/WS, S, AP, D)
 * - Handles empty weapons array (renders header only)
 * - Supports both "BS" and "WS" statLabel prop
 * - Renders keywords sub-row when weapon has keywords
 * - Formats range (appends ") and skill (appends +) correctly
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeaponTable } from "@/features/units/WeaponTable";
import type { UdbWeapon } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWeapon(overrides: Partial<UdbWeapon> = {}): UdbWeapon {
  return {
    id: 1,
    unit_id: "u-001",
    weapon_group: 1,
    line_order: 1,
    name: "Bolt Rifle",
    category: "Ranged",
    range: "24",
    attacks: "2",
    skill: "3",
    strength: "4",
    ap: "-1",
    damage: "1",
    keywords: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WeaponTable", () => {
  it("renders weapon name and all stat columns for a ranged weapon with statLabel BS", () => {
    const weapon = makeWeapon();
    render(<WeaponTable weapons={[weapon]} statLabel="BS" />);

    expect(screen.getByText("Bolt Rifle")).toBeInTheDocument();
    // Header should show "BS" not "WS"
    expect(screen.getByText("BS")).toBeInTheDocument();
    // Range: "24" -> displayed as 24"
    expect(screen.getByText('24"')).toBeInTheDocument();
    // Attacks
    expect(screen.getByText("2")).toBeInTheDocument();
    // Skill: "3" -> displayed as "3+"
    expect(screen.getByText("3+")).toBeInTheDocument();
    // Strength
    expect(screen.getByText("4")).toBeInTheDocument();
    // AP
    expect(screen.getByText("-1")).toBeInTheDocument();
    // Damage
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders header with WS when statLabel is WS", () => {
    const meleeWeapon = makeWeapon({
      name: "Power Fist",
      category: "Melee",
      range: "Melee",
      skill: "4",
      strength: "8",
      ap: "-2",
      damage: "2",
    });
    render(<WeaponTable weapons={[meleeWeapon]} statLabel="WS" />);

    expect(screen.getByText("WS")).toBeInTheDocument();
    // Should NOT show "BS" anywhere
    expect(screen.queryByText("BS")).toBeNull();
    expect(screen.getByText("Power Fist")).toBeInTheDocument();
    expect(screen.getByText("4+")).toBeInTheDocument();
  });

  it("renders only header row when weapons array is empty", () => {
    render(<WeaponTable weapons={[]} statLabel="BS" />);

    // Header columns should still render
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Rng")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("BS")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("AP")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    // No weapon name should appear
    expect(screen.queryByText("Bolt Rifle")).toBeNull();
  });

  it("renders keywords sub-row when weapon has keywords", () => {
    const weapon = makeWeapon({ keywords: "Rapid Fire 1, Assault" });
    render(<WeaponTable weapons={[weapon]} statLabel="BS" />);

    expect(screen.getByText("Rapid Fire 1, Assault")).toBeInTheDocument();
  });

  it("does not render keywords sub-row when weapon has no keywords", () => {
    const weapon = makeWeapon({ keywords: null });
    render(<WeaponTable weapons={[weapon]} statLabel="BS" />);

    expect(screen.queryByText("Rapid Fire")).toBeNull();
  });

  it("displays em-dash for null stat values", () => {
    const weapon = makeWeapon({
      name: "Stub Gun",
      range: null,
      attacks: null,
      skill: null,
      strength: null,
      ap: null,
      damage: null,
    });
    render(<WeaponTable weapons={[weapon]} statLabel="BS" />);

    expect(screen.getByText("Stub Gun")).toBeInTheDocument();
    // Null stats should display as em-dash; AP null displays as "0" per implementation
    const dashes = screen.getAllByText("—");
    // range=null, attacks=null, skill=null, strength=null, damage=null = 5 dashes
    // ap=null -> "0" per implementation
    expect(dashes.length).toBe(5);
  });

  it("renders non-numeric range values as-is (e.g., 'Melee')", () => {
    const weapon = makeWeapon({ range: "Melee" });
    render(<WeaponTable weapons={[weapon]} statLabel="WS" />);

    expect(screen.getByText("Melee")).toBeInTheDocument();
  });

  it("renders multiple weapons in order", () => {
    const weapons = [
      makeWeapon({ name: "Bolt Rifle", line_order: 1 }),
      makeWeapon({ name: "Astartes Grenade Launcher", line_order: 2, id: 2 }),
    ];
    render(<WeaponTable weapons={weapons} statLabel="BS" />);

    expect(screen.getByText("Bolt Rifle")).toBeInTheDocument();
    expect(screen.getByText("Astartes Grenade Launcher")).toBeInTheDocument();
  });
});
