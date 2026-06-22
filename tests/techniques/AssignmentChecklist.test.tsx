/**
 * INTG-03 — AssignmentChecklist: technique steps resolve via effectivePaintId.
 *
 * Proves that a technique step (technique_step_id set, paint_id null) with a filled
 * slot in the slotMap renders in the checklist with its resolved paint name/swatch —
 * the per-unit list is NOT empty for technique-owned steps.
 *
 * Also verifies:
 * - A technique step with an unfilled slot still renders its row (step name visible)
 * - A plain step with a paint_id still renders its paint (FND-04 fallback unbroken)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssignmentChecklist } from "@/features/recipes/AssignmentChecklist";
import type { RecipeAssignment } from "@/types/recipeAssignment";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";
import type { Unit } from "@/types/unit";

// ---------------------------------------------------------------------------
// Mocks — prevent all Tauri / DB calls
// ---------------------------------------------------------------------------

// Technique step (technique_step_id set, paint_id null)
const TECHNIQUE_STEP_ID = 10;
const TECHNIQUE_RECIPE_STEP_ID = 101;
const PLAIN_STEP_ID = 102;
const SLOT_RESOLVED_PAINT_ID = 55;
const PLAIN_PAINT_ID = 77;

const techniqueStep: RecipeStep = {
  id: TECHNIQUE_RECIPE_STEP_ID,
  recipe_id: 1,
  step_name: "OSL Glow Layer",
  paint_id: null,
  technique_step_id: TECHNIQUE_STEP_ID,
  order_index: 0,
  notes: null,
  painting_phase: null,
  tool: null,
  technique: null,
  dilution: null,
  time_estimate_minutes: null,
  step_photo_path: null,
  alt_paint_id: null,
  section_id: null,
  created_at: "2026-01-01",
};

const plainStep: RecipeStep = {
  id: PLAIN_STEP_ID,
  recipe_id: 1,
  step_name: "Base Armour",
  paint_id: PLAIN_PAINT_ID,
  technique_step_id: null,
  order_index: 1,
  notes: null,
  painting_phase: null,
  tool: null,
  technique: null,
  dilution: null,
  time_estimate_minutes: null,
  step_photo_path: null,
  alt_paint_id: null,
  section_id: null,
  created_at: "2026-01-01",
};

const slotResolvedPaint: Paint = {
  id: SLOT_RESOLVED_PAINT_ID,
  brand: "Citadel",
  name: "Hexos Palesun",
  paint_type: "Layer",
  color_family: null,
  hex_color: "#f5e642",
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

const plainPaint: Paint = {
  id: PLAIN_PAINT_ID,
  brand: "Citadel",
  name: "Macragge Blue",
  paint_type: "Base",
  color_family: null,
  hex_color: "#1e3a5f",
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

const mockUnit: Unit = {
  id: 1,
  faction_id: 1,
  name: "Tactical Squad",
  category: null,
  unit_type: "Infantry",
  model_count: 5,
  owned_count: null,
  points: 100,
  status_assembly: 0,
  status_painting: "Not Started",
  painting_percentage: 0,
  status_basing: 0,
  status_varnished: 0,
  is_active_project: 0,
  priority: null,
  target_completion_date: null,
  purchase_date: null,
  purchase_price_pence: null,
  storage_location: null,
  main_image_path: null,
  notes: null,
  lore_notes: null,
  undercoat: null,
  status_assembly_override: 0,
  status_basing_override: 0,
  status_varnished_override: 0,
  udb_unit_id: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

const mockAssignment: RecipeAssignment = {
  id: 999,
  unit_id: 1,
  recipe_id: 1,
  created_at: "2026-01-01",
};

// Data hook mocks — filled slot case
let mockSteps: RecipeStep[] = [techniqueStep, plainStep];
let mockSlotMap: Map<number, number | null> = new Map([
  [TECHNIQUE_RECIPE_STEP_ID, SLOT_RESOLVED_PAINT_ID], // filled slot
]);

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: mockSteps }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  // No sections → flat list path (keeps test simple)
  useRecipeSections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useStepProgress: () => ({ data: [] }),
  useToggleStepProgress: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [slotResolvedPaint, plainPaint] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnit: () => ({ data: mockUnit }),
  useUpdateUnit: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useSlotResolutionMap", () => ({
  useSlotResolutionMap: () => ({ data: mockSlotMap }),
}));

// ---------------------------------------------------------------------------
// Fixtures reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSteps = [techniqueStep, plainStep];
  mockSlotMap = new Map([[TECHNIQUE_RECIPE_STEP_ID, SLOT_RESOLVED_PAINT_ID]]);
});

// ---------------------------------------------------------------------------
// INTG-03 tests
// ---------------------------------------------------------------------------

describe("AssignmentChecklist — INTG-03 (technique step resolution)", () => {
  it("renders the technique step row — list is NOT empty for a technique-owned step", () => {
    render(
      <AssignmentChecklist
        assignment={mockAssignment}
        recipeId={1}
        unitId={1}
      />
    );
    // The technique step must appear in the checklist (not filtered out)
    expect(screen.getByText("OSL Glow Layer")).toBeInTheDocument();
  });

  it("renders the resolved paint name for a technique step with a filled slot (technique_step_id set)", async () => {
    const user = userEvent.setup();
    render(
      <AssignmentChecklist
        assignment={mockAssignment}
        recipeId={1}
        unitId={1}
      />
    );
    // The technique step renders as a collapsible row (hasDetail=true because paint resolves).
    // Expand it to reveal the paint swatch detail.
    const triggerText = screen.getByText("OSL Glow Layer");
    await user.click(triggerText);
    // The slot-resolved paint name must now appear (effectivePaintId routed through slotMap)
    expect(screen.getByText(/Hexos Palesun/)).toBeInTheDocument();
  });

  it("still renders the technique step row when its slot is unfilled (no swatch, but step name visible)", () => {
    // Override: unfilled slot (map value null)
    mockSlotMap = new Map([[TECHNIQUE_RECIPE_STEP_ID, null]]);
    render(
      <AssignmentChecklist
        assignment={mockAssignment}
        recipeId={1}
        unitId={1}
      />
    );
    expect(screen.getByText("OSL Glow Layer")).toBeInTheDocument();
    // No resolved paint name for this step
    expect(screen.queryByText(/Hexos Palesun/)).not.toBeInTheDocument();
  });

  it("renders the plain step's paint (FND-04 fallback: step.paint_id used for non-technique steps)", async () => {
    const user = userEvent.setup();
    render(
      <AssignmentChecklist
        assignment={mockAssignment}
        recipeId={1}
        unitId={1}
      />
    );
    expect(screen.getByText("Base Armour")).toBeInTheDocument();
    // Expand the plain step to reveal paint detail
    const triggerText = screen.getByText("Base Armour");
    await user.click(triggerText);
    expect(screen.getByText(/Macragge Blue/)).toBeInTheDocument();
  });
});
