/**
 * INTG-07 — SlotReassignMiniDialog component test.
 *
 * Focused single-slot reassign mini-dialog: verifies
 *   1. The dialog title renders when open with a valid slot
 *   2. Clicking "Reassign paint" calls updateSlotMap.mutateAsync with
 *      { instanceId, recipeId, slotFills } where slotFills is a single-entry
 *      Map keyed on the target slotId
 *   3. toast.success("Slot updated.") fires and onClose is called on success
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SlotReassignMiniDialog } from "@/features/painting-mode/SlotReassignMiniDialog";
import type { TechniqueColourSlot } from "@/types/technique";
import type { Paint } from "@/types/paint";

// ---------------------------------------------------------------------------
// Mock hooks (no Tauri / DB calls in jsdom)
// ---------------------------------------------------------------------------

const TEST_SLOT_ID = 7;
const TEST_INSTANCE_ID = 42;
const TEST_TECHNIQUE_ID = 3;
const TEST_RECIPE_ID = 1;

const mockSlot: TechniqueColourSlot = {
  id: TEST_SLOT_ID,
  technique_id: TEST_TECHNIQUE_ID,
  name: "Base Colour",
  role_hint: "Main armour colour",
  order_index: 0,
  created_at: "2026-01-01 00:00:00",
};

const mockPaint: Paint = {
  id: 5,
  brand: "Citadel",
  name: "Abaddon Black",
  paint_type: "Base",
  color_family: null,
  hex_color: "#231f20",
  owned: 1,
  quantity: null,
  running_low: 0,
  wishlist: 0,
  notes: null,
  purchase_price_pence: null,
  purchase_date: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

vi.mock("@/hooks/useTechniqueColourSlots", () => ({
  useTechniqueColourSlots: () => ({
    data: [mockSlot],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useSlotResolutionMap", () => ({
  useSlotMapByInstance: () => ({
    data: new Map([[TEST_SLOT_ID, null]]),
    isLoading: false,
  }),
}));

const mockMutateAsync = vi.fn();

vi.mock("@/hooks/useTechniqueInstances", () => ({
  useUpdateSlotMap: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useInstancesForRecipe: () => ({ data: [] }),
  getInstancesForRecipe: vi.fn(),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [mockPaint] }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SlotReassignMiniDialog — INTG-07", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  function renderDialog(open = true) {
    return render(
      <SlotReassignMiniDialog
        open={open}
        instanceId={TEST_INSTANCE_ID}
        slotId={TEST_SLOT_ID}
        techniqueId={TEST_TECHNIQUE_ID}
        recipeId={TEST_RECIPE_ID}
        onClose={onClose}
      />,
    );
  }

  it("renders the dialog title when open with a valid slot", () => {
    renderDialog();
    expect(screen.getByText("Reassign slot colour")).toBeInTheDocument();
  });

  it("renders the dialog description", () => {
    renderDialog();
    expect(
      screen.getByText("Change the paint assigned to this colour slot."),
    ).toBeInTheDocument();
  });

  it("clicking 'Reassign paint' calls mutateAsync with single-slot Map and closes on success", async () => {
    renderDialog();
    const user = userEvent.setup();

    const saveButton = screen.getByRole("button", { name: /reassign paint/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const call = mockMutateAsync.mock.calls[0][0] as {
      instanceId: number;
      recipeId: number;
      slotFills: Map<number, number | null>;
    };

    expect(call.instanceId).toBe(TEST_INSTANCE_ID);
    expect(call.recipeId).toBe(TEST_RECIPE_ID);
    expect(call.slotFills).toBeInstanceOf(Map);
    expect(call.slotFills.has(TEST_SLOT_ID)).toBe(true);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Slot updated.");
    });
    expect(onClose).toHaveBeenCalled();
  });
});
