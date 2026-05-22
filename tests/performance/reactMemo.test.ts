/**
 * PERF-04 — Verify that KanbanCard, ArmyListUnitRow, and CurrentFocusCard
 * are wrapped with React.memo.
 *
 * React.memo sets $$typeof = Symbol(react.memo) on the wrapped component.
 * This test checks for that symbol to confirm memo wrapping without rendering.
 */
import { describe, it, expect } from "vitest";
import { KanbanCard } from "@/features/painting-projects/KanbanCard";
import { ArmyListUnitRow } from "@/features/army-lists/ArmyListUnitRow";
import { CurrentFocusCard } from "@/features/dashboard/CurrentFocusCard";

describe("React.memo verification (PERF-04)", () => {
  it("KanbanCard is wrapped with React.memo", () => {
    // React.memo components have $$typeof = Symbol(react.memo)
    expect(KanbanCard).toHaveProperty("$$typeof");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((KanbanCard as any).$$typeof?.toString()).toContain("memo");
  });

  it("KanbanCard.displayName is set to 'KanbanCard'", () => {
    expect(KanbanCard.displayName).toBe("KanbanCard");
  });

  it("ArmyListUnitRow is wrapped with React.memo", () => {
    expect(ArmyListUnitRow).toHaveProperty("$$typeof");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((ArmyListUnitRow as any).$$typeof?.toString()).toContain("memo");
  });

  it("ArmyListUnitRow.displayName is set to 'ArmyListUnitRow'", () => {
    expect(ArmyListUnitRow.displayName).toBe("ArmyListUnitRow");
  });

  it("CurrentFocusCard is wrapped with React.memo", () => {
    expect(CurrentFocusCard).toHaveProperty("$$typeof");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((CurrentFocusCard as any).$$typeof?.toString()).toContain("memo");
  });

  it("CurrentFocusCard.displayName is set to 'CurrentFocusCard'", () => {
    expect(CurrentFocusCard.displayName).toBe("CurrentFocusCard");
  });
});
