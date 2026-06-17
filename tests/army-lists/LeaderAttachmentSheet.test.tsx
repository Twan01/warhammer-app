/**
 * Phase 137 — LeaderAttachmentSheet component tests (PLAY-03).
 *
 * Replaces the Phase-92 name-match tests with canonical id-based validation
 * tests. Mocks @/hooks/useLeaderTargets with CanonicalLeaderPairRow[] via
 * vi.mock. Covers:
 *
 *   Test 1 (canonical path): leader has udb_unit_id → only the paired target
 *     is offered; an unpaired unit is NOT shown.
 *
 *   Test 2 (NULL permissive fallback — D-09 / Pitfall 5 regression guard):
 *     leader has udb_unit_id: null → ALL units are offered as selectable
 *     AND the quiet advisory text is present.
 *
 *   Plus: retained interaction tests (attach/detach mutate calls, disabled
 *     state, current attachment banner).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeaderAttachmentSheet } from "@/features/army-lists/LeaderAttachmentSheet";
import type { ArmyListUnitRow, ArmyList } from "@/types/armyList";
import type { CanonicalLeaderPairRow } from "@/db/queries/leaderTargets";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetLeaderAttachment = vi.fn();
const mockClearLeaderAttachment = vi.fn();

vi.mock("@/hooks/useArmyLists", () => ({
  useSetLeaderAttachment: () => ({
    mutate: mockSetLeaderAttachment,
    isPending: false,
  }),
  useClearLeaderAttachment: () => ({
    mutate: mockClearLeaderAttachment,
    isPending: false,
  }),
}));

// Controlled mock — each test suite can override via mockLeaderPairs variable.
let mockLeaderPairs: CanonicalLeaderPairRow[] = [];

vi.mock("@/hooks/useLeaderTargets", () => ({
  useLeaderTargets: () => ({
    data: mockLeaderPairs,
    isLoading: false,
  }),
  LEADER_TARGETS_KEY: (listId: number) => ["leader-targets", listId] as const,
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    sort_order: 0,
    created_at: "2024-01-01",
    unit_name: "Captain",
    unit_points: 80,
    udb_unit_id: "SM_CAPTAIN",
    faction_id: 1,
    unit_category: null,
    unit_model_count: null,
    status_assembly: 1,
    status_painting: "Completed",
    udb_base_points: null,
    udb_role: null,
    udb_keywords: null,
    override_points: null,
    tier_points: null,
    painting_percentage: 100,
    effective_points: 80,
    tactical_role: null,
    ...overrides,
  };
}

function makeList(overrides: Partial<ArmyList> = {}): ArmyList {
  return {
    id: 1,
    name: "Test List",
    faction_id: 1,
    detachment_id: null,
    detachment_name: null,
    points_limit: 2000,
    list_type: null,
    notes: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderSheet(
  unit: ArmyListUnitRow,
  units: ArmyListUnitRow[],
  list: ArmyList = makeList(),
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <LeaderAttachmentSheet
          open={true}
          unit={unit}
          list={list}
          units={units}
          onClose={() => {}}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LeaderAttachmentSheet (PLAY-03 — canonical id-based validation)", () => {
  beforeEach(() => {
    mockSetLeaderAttachment.mockClear();
    mockClearLeaderAttachment.mockClear();
    mockLeaderPairs = [];
  });

  // -------------------------------------------------------------------------
  // Test 1: Canonical path — leader has udb_unit_id
  // -------------------------------------------------------------------------

  it("Test 1 (canonical path): shows only paired target, excludes unpaired unit", () => {
    // leader_alu_id: 1 (the leader), target_alu_id: 2 (the valid target)
    mockLeaderPairs = [{ leader_alu_id: 1, target_alu_id: 2 }];

    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN" });
    const validTarget = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const invalidTarget = makeUnit({ id: 3, unit_name: "Sternguard Veterans", effective_points: 95 });

    renderSheet(leader, [leader, validTarget, invalidTarget]);

    // Valid target must render
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    // Unpaired unit must NOT render as a valid target
    expect(screen.queryByText("Sternguard Veterans")).not.toBeInTheDocument();
    // Advisory must NOT render (leader has canonical data)
    expect(
      screen.queryByText(/No canonical attachment data/),
    ).not.toBeInTheDocument();
  });

  it("Test 1 (canonical path): Attach Leader button is present for the valid target", () => {
    mockLeaderPairs = [{ leader_alu_id: 1, target_alu_id: 2 }];

    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN" });
    const validTarget = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });

    renderSheet(leader, [leader, validTarget]);

    expect(screen.getByRole("button", { name: "Attach Leader" })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Test 2: NULL permissive fallback — D-09 / Pitfall 5 regression guard
  // -------------------------------------------------------------------------

  it("Test 2 (NULL permissive fallback): shows ALL units when leader has udb_unit_id: null", () => {
    // Hook returns empty array (no pairs — NULL leader has no canonical data)
    mockLeaderPairs = [];

    const leader = makeUnit({ id: 1, unit_name: "Ghost Captain", udb_unit_id: null });
    const unit1 = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const unit2 = makeUnit({ id: 3, unit_name: "Assault Intercessors", effective_points: 90 });

    renderSheet(leader, [leader, unit1, unit2]);

    // ALL units must be shown (permissive — not blocked), including the leader itself
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Assault Intercessors")).toBeInTheDocument();
    // Attach Leader buttons for ALL 3 units (permissive path: leader + unit1 + unit2)
    const attachButtons = screen.getAllByRole("button", { name: "Attach Leader" });
    expect(attachButtons.length).toBe(3);
  });

  it("Test 2 (NULL permissive fallback): advisory text renders when leader has udb_unit_id: null", () => {
    mockLeaderPairs = [];

    const leader = makeUnit({ id: 1, unit_name: "Ghost Captain", udb_unit_id: null });
    const unit1 = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });

    renderSheet(leader, [leader, unit1]);

    // Advisory MUST be present
    expect(
      screen.getByText(/No canonical attachment data/),
    ).toBeInTheDocument();
  });

  it("Test 2 (NULL permissive fallback): empty validTargetIds is NOT an empty Set — all units pass", () => {
    // Even with 0 pairs returned, NULL udb_unit_id must give ALL units (permissive),
    // not an empty list (which would mean "canonically no valid targets").
    mockLeaderPairs = [];

    const leader = makeUnit({ id: 1, unit_name: "Manual Unit", udb_unit_id: null });
    const unit1 = makeUnit({ id: 2, unit_name: "Tactical Squad", effective_points: 110 });
    const unit2 = makeUnit({ id: 3, unit_name: "Devastators", effective_points: 120 });
    const unit3 = makeUnit({ id: 4, unit_name: "Heavy Intercessors", effective_points: 130 });

    renderSheet(leader, [leader, unit1, unit2, unit3]);

    // All 3 non-leader units must appear (permissive path, not blocked)
    expect(screen.getByText("Tactical Squad")).toBeInTheDocument();
    expect(screen.getByText("Devastators")).toBeInTheDocument();
    expect(screen.getByText("Heavy Intercessors")).toBeInTheDocument();
    // All 4 units are shown (permissive — includes the leader unit itself)
    const attachButtons = screen.getAllByRole("button", { name: "Attach Leader" });
    expect(attachButtons.length).toBe(4);
  });

  // -------------------------------------------------------------------------
  // Interaction tests (attach / detach)
  // -------------------------------------------------------------------------

  it("calls setLeaderAttachment.mutate with correct args on Attach click", async () => {
    const user = userEvent.setup();
    mockLeaderPairs = [{ leader_alu_id: 1, target_alu_id: 2 }];

    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN" });
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    renderSheet(leader, [leader, target]);

    const attachButton = screen.getByRole("button", { name: "Attach Leader" });
    await user.click(attachButton);

    expect(mockSetLeaderAttachment).toHaveBeenCalledWith(
      { army_list_unit_id: 1, target_id: 2, list_id: 1 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("shows current attachment banner and Detach button when leader is already attached", () => {
    mockLeaderPairs = [{ leader_alu_id: 1, target_alu_id: 2 }];

    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN", leader_attached_to_id: 2 });
    renderSheet(leader, [leader, target]);

    expect(screen.getByText("Currently attached to")).toBeInTheDocument();
    const detachButtons = screen.getAllByRole("button", { name: "Detach Leader" });
    expect(detachButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls clearLeaderAttachment.mutate on Detach click", async () => {
    const user = userEvent.setup();
    mockLeaderPairs = [{ leader_alu_id: 1, target_alu_id: 2 }];

    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN", leader_attached_to_id: 2 });
    renderSheet(leader, [leader, target]);

    const detachButtons = screen.getAllByRole("button", { name: "Detach Leader" });
    await user.click(detachButtons[0]);

    expect(mockClearLeaderAttachment).toHaveBeenCalledWith(
      { army_list_unit_id: 1, list_id: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("shows disabled Attach button with tooltip when target already has a different leader", async () => {
    const user = userEvent.setup();
    mockLeaderPairs = [
      { leader_alu_id: 1, target_alu_id: 2 },
      { leader_alu_id: 3, target_alu_id: 2 },
    ];

    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN" });
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    // otherLeader already attached to the target
    const otherLeader = makeUnit({
      id: 3,
      unit_name: "Librarian",
      udb_unit_id: "SM_LIBRARIAN",
      leader_attached_to_id: 2,
    });

    renderSheet(leader, [leader, target, otherLeader]);

    const attachButton = screen.getByRole("button", { name: "Attach Leader" });
    expect(attachButton).toBeDisabled();

    const tooltipTrigger = attachButton.closest("span");
    expect(tooltipTrigger).not.toBeNull();
    await user.hover(tooltipTrigger!);
    const tooltipTexts = await screen.findAllByText("Already led by Librarian");
    expect(tooltipTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No valid targets in this list' when canonical leader has no matching units in list", () => {
    // Leader has canonical data but the paired target unit is NOT in the list
    mockLeaderPairs = [{ leader_alu_id: 1, target_alu_id: 99 /* not in list */ }];

    const leader = makeUnit({ id: 1, unit_name: "Captain", udb_unit_id: "SM_CAPTAIN" });
    renderSheet(leader, [leader]);

    expect(screen.getByText("No valid targets in this list")).toBeInTheDocument();
    // Advisory must NOT appear (leader has canonical data)
    expect(screen.queryByText(/No canonical attachment data/)).not.toBeInTheDocument();
  });

  it("renders sheet title with unit name when open", () => {
    mockLeaderPairs = [];
    const leader = makeUnit({ unit_name: "Captain", udb_unit_id: "SM_CAPTAIN" });
    renderSheet(leader, [leader]);

    expect(screen.getByText(/Captain — Leader Attachment/)).toBeInTheDocument();
    expect(screen.getByText("Attach this leader to a valid target unit")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Source-level verification: toast.success calls are present
  // -------------------------------------------------------------------------

  it("source contains toast.success for attach and detach operations", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/army-lists/LeaderAttachmentSheet.tsx"),
      "utf-8",
    );

    expect(source).toContain('toast.success("Leader attached.")');
    expect(source).toContain('toast.success("Leader detached.")');
  });
});
