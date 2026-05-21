/**
 * Phase 92 -- LeaderAttachmentSheet tests (LDR-01, LDR-02).
 *
 * Covers target display, attach/detach actions, disabled states, and empty state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeaderAttachmentSheet } from "@/features/army-lists/LeaderAttachmentSheet";
import type { ArmyListUnitRow, ArmyList } from "@/types/armyList";

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

const mockLeaderTargets = [
  { leader_name: "Captain", faction_id: "1", target_name: "Intercessors", synced_at: "2024-01-01" },
  { leader_name: "Captain", faction_id: "1", target_name: "Assault Intercessors", synced_at: "2024-01-01" },
  { leader_name: "Librarian", faction_id: "1", target_name: "Sternguard Veterans", synced_at: "2024-01-01" },
];

vi.mock("@/hooks/useLeaderTargets", () => ({
  useLeaderTargets: () => ({
    data: mockLeaderTargets,
    isLoading: false,
  }),
  LEADER_TARGETS_KEY: (factionId: string) => ["leader-targets", factionId] as const,
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
    created_at: "2024-01-01",
    unit_name: "Captain",
    unit_points: 80,
    faction_id: 1,
    status_assembly: 1,
    status_painting: "Completed",
    synced_points: null,
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

describe("LeaderAttachmentSheet", () => {
  beforeEach(() => {
    mockSetLeaderAttachment.mockClear();
    mockClearLeaderAttachment.mockClear();
  });

  it("renders sheet title with unit name when open", () => {
    const leader = makeUnit({ unit_name: "Captain" });
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    renderSheet(leader, [leader, target]);

    expect(screen.getByText(/Captain — Leader Attachment/)).toBeInTheDocument();
    expect(screen.getByText("Attach this leader to a valid target unit")).toBeInTheDocument();
  });

  it("shows valid target units with Attach Leader buttons", () => {
    const leader = makeUnit({ unit_name: "Captain" });
    const target1 = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const target2 = makeUnit({ id: 3, unit_name: "Assault Intercessors", effective_points: 90 });
    renderSheet(leader, [leader, target1, target2]);

    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("100 pts")).toBeInTheDocument();
    expect(screen.getByText("Assault Intercessors")).toBeInTheDocument();
    expect(screen.getByText("90 pts")).toBeInTheDocument();

    const attachButtons = screen.getAllByRole("button", { name: "Attach Leader" });
    expect(attachButtons).toHaveLength(2);
  });

  it("shows disabled Attach button with tooltip when target already has a leader", async () => {
    const leader = makeUnit({ id: 1, unit_name: "Captain" });
    const otherLeader = makeUnit({ id: 3, unit_name: "Librarian", leader_attached_to_id: 2 });
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    // Intercessors already has Librarian attached (otherLeader.leader_attached_to_id === target.id)
    renderSheet(leader, [leader, target, otherLeader]);

    // The Attach Leader button should be disabled
    const attachButton = screen.getByRole("button", { name: "Attach Leader" });
    expect(attachButton).toBeDisabled();

    // Hover to show tooltip
    const user = userEvent.setup();
    const tooltipTrigger = attachButton.closest("span");
    expect(tooltipTrigger).not.toBeNull();
    await user.hover(tooltipTrigger!);

    // Tooltip should show the existing leader name (Radix renders tooltip text in multiple DOM nodes)
    const tooltipTexts = await screen.findAllByText("Already led by Librarian");
    expect(tooltipTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Detach Leader button when leader is already attached", () => {
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const leader = makeUnit({ id: 1, unit_name: "Captain", leader_attached_to_id: 2 });
    renderSheet(leader, [leader, target]);

    // Current attachment banner
    expect(screen.getByText("Currently attached to")).toBeInTheDocument();
    // Detach buttons (banner + in-list)
    const detachButtons = screen.getAllByRole("button", { name: "Detach Leader" });
    expect(detachButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls setLeaderAttachment.mutate on Attach click", async () => {
    const user = userEvent.setup();
    const leader = makeUnit({ id: 1, unit_name: "Captain" });
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    renderSheet(leader, [leader, target]);

    const attachButton = screen.getByRole("button", { name: "Attach Leader" });
    await user.click(attachButton);

    expect(mockSetLeaderAttachment).toHaveBeenCalledWith(
      { army_list_unit_id: 1, target_id: 2, list_id: 1 },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("calls clearLeaderAttachment.mutate on Detach click", async () => {
    const user = userEvent.setup();
    const target = makeUnit({ id: 2, unit_name: "Intercessors", effective_points: 100 });
    const leader = makeUnit({ id: 1, unit_name: "Captain", leader_attached_to_id: 2 });
    renderSheet(leader, [leader, target]);

    // Click the first Detach Leader button (from the banner)
    const detachButtons = screen.getAllByRole("button", { name: "Detach Leader" });
    await user.click(detachButtons[0]);

    expect(mockClearLeaderAttachment).toHaveBeenCalledWith(
      { army_list_unit_id: 1, list_id: 1 },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("shows empty state message when no valid targets in list", () => {
    const leader = makeUnit({ id: 1, unit_name: "Captain" });
    // No targets in the list - only the leader itself
    renderSheet(leader, [leader]);

    expect(screen.getByText("No valid targets in this list")).toBeInTheDocument();
    expect(
      screen.getByText(/Add one of the following units to attach this leader: Intercessors, Assault Intercessors/),
    ).toBeInTheDocument();
  });

  it("shows no faction guard when faction is not set", () => {
    const leader = makeUnit({ id: 1, unit_name: "Captain", faction_id: null });
    const list = makeList({ faction_id: null });
    renderSheet(leader, [leader], list);

    expect(screen.getByText("No faction selected for this list.")).toBeInTheDocument();
  });
});
