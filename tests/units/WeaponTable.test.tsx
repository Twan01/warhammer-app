/**
 * Phase 110 -- WeaponTable component tests.
 *
 * Covers INT-02 (weapon profiles visible):
 * - Renders weapon name and stat columns (Range, A, BS/WS, S, AP, D)
 * - Handles empty weapons array (renders header only)
 * - Supports both "BS" and "WS" statLabel prop
 * - Renders keywords sub-row when weapon has keywords
 * - Formats range (appends ") and skill (appends +) correctly
 *
 * Phase 136 (HON-08) -- WeaponTable render contract regression lock:
 * - Range integer suffix guard (24 -> 24")
 * - Raw non-numeric range (Melee -> Melee)
 * - Null fallbacks -> —
 * - Skill + guard including already-suffixed (3 -> 3+, 3+ -> 3+)
 * - Header label is "Rng" NOT "Range"
 * - statLabel column (BS / WS)
 * - Keywords row has class leading-relaxed and NOT italic
 * - EN/FR parity: component is locale-agnostic; DOM structure is identical
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
// Tests — original Phase 110 coverage
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

  // -------------------------------------------------------------------------
  // Phase 136 HON-08 render contract regression lock
  // -------------------------------------------------------------------------

  describe("HON-08 render contract (regression lock)", () => {
    it("appends inch suffix to plain integer range values", () => {
      const weapon = makeWeapon({ range: "24" });
      render(<WeaponTable weapons={[weapon]} statLabel="BS" />);
      expect(screen.getByText('24"')).toBeInTheDocument();
    });

    it("renders non-numeric range values raw without modification", () => {
      const weapon = makeWeapon({ range: "Melee" });
      render(<WeaponTable weapons={[weapon]} statLabel="WS" />);
      expect(screen.getByText("Melee")).toBeInTheDocument();
      // Must NOT append inch suffix to non-numeric
      expect(screen.queryByText('Melee"')).toBeNull();
    });

    it("renders null range as em-dash", () => {
      const weapon = makeWeapon({ range: null });
      render(<WeaponTable weapons={[weapon]} statLabel="BS" />);
      // At least one em-dash for range
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("appends + to skill values that do not already end in +", () => {
      const weapon = makeWeapon({ skill: "3" });
      render(<WeaponTable weapons={[weapon]} statLabel="BS" />);
      expect(screen.getByText("3+")).toBeInTheDocument();
    });

    it("does not double-append + when skill already ends in +", () => {
      const weapon = makeWeapon({ skill: "3+" });
      render(<WeaponTable weapons={[weapon]} statLabel="BS" />);
      expect(screen.getByText("3+")).toBeInTheDocument();
      expect(screen.queryByText("3++")).toBeNull();
    });

    it("renders null skill as em-dash", () => {
      const weapon = makeWeapon({ skill: null });
      render(<WeaponTable weapons={[weapon]} statLabel="BS" />);
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("renders header label Rng (not Range)", () => {
      render(<WeaponTable weapons={[]} statLabel="BS" />);
      expect(screen.getByText("Rng")).toBeInTheDocument();
      expect(screen.queryByText("Range")).toBeNull();
    });

    it("renders statLabel column as BS", () => {
      render(<WeaponTable weapons={[]} statLabel="BS" />);
      expect(screen.getByText("BS")).toBeInTheDocument();
    });

    it("renders statLabel column as WS", () => {
      render(<WeaponTable weapons={[]} statLabel="WS" />);
      expect(screen.getByText("WS")).toBeInTheDocument();
    });

    it("keywords row has leading-relaxed class and is not italic", () => {
      const weapon = makeWeapon({ keywords: "Rapid Fire 1, Assault" });
      const { container } = render(
        <WeaponTable weapons={[weapon]} statLabel="BS" />,
      );

      const keywordsEl = container.querySelector("p");
      expect(keywordsEl).not.toBeNull();
      // Must have leading-relaxed
      expect(keywordsEl!.className).toContain("leading-relaxed");
      // Must NOT be italic
      expect(keywordsEl!.className).not.toContain("italic");
    });

    it("EN/FR parity: identical DOM structure regardless of passed weapon name strings", () => {
      const enWeapon = makeWeapon({
        name: "Bolt Rifle",
        keywords: "Rapid Fire 1",
      });
      const frWeapon = makeWeapon({
        name: "Fusil Bolter",
        keywords: "Tir rapide 1",
      });

      const { container: enContainer } = render(
        <WeaponTable weapons={[enWeapon]} statLabel="BS" />,
      );
      const { container: frContainer } = render(
        <WeaponTable weapons={[frWeapon]} statLabel="BS" />,
      );

      // Collect tag names + class names (structural identity, ignoring text content)
      function structuralSnapshot(root: Element): string {
        const parts: string[] = [];
        function walk(el: Element) {
          parts.push(`${el.tagName}:${el.className}`);
          for (const child of el.children) walk(child);
        }
        walk(root);
        return parts.join("|");
      }

      const enStructure = structuralSnapshot(enContainer.firstElementChild!);
      const frStructure = structuralSnapshot(frContainer.firstElementChild!);
      expect(enStructure).toBe(frStructure);
    });
  });
});
