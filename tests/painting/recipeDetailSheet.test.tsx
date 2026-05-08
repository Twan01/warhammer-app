/**
 * DATA-05 — RecipeDetailSheet unit link navigation tests.
 *
 * RecipeDetailSheet's "Linked Unit" field renders a variant="link" Button
 * (not a plain span) when a unit is associated, and navigates to /collection
 * on click. When no unit is linked, it renders a dash span instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecipeDetailSheet } from "@/features/recipes/RecipeDetailSheet";
import type { PaintingRecipe } from "@/types/recipe";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";

// ---------------------------------------------------------------------------
// Mock hooks to prevent Tauri / DB calls
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: mockUnits }),
}));

let mockPaints: Paint[] = [];
vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: mockPaints }),
}));

let mockSteps: RecipeStep[] = [];
vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: mockSteps }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [], isLoading: false }),
}));

const mockDuplicateMutateAsync = vi.fn();
vi.mock("@/hooks/useRecipes", () => ({
  useDuplicateRecipe: () => ({
    mutateAsync: mockDuplicateMutateAsync,
    isPending: false,
  }),
}));

let mockWishlistItems: { id: number; name: string }[] = [];
const mockCreateWishlistMutateAsync = vi.fn();
vi.mock("@/hooks/useWishlistItems", () => ({
  useWishlistItems: () => ({ data: mockWishlistItems }),
  useCreateWishlistItem: () => ({
    mutateAsync: mockCreateWishlistMutateAsync,
    isPending: false,
  }),
}));

// Mock Tauri path and core APIs (not available in jsdom)
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));

let mockSessions: {
  id: number;
  unit_id: number;
  session_date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  recipe_id: number | null;
  recipe_step_id: number | null;
}[] = [];
vi.mock("@/hooks/useJournalSessions", () => ({
  useSessionsByRecipe: () => ({ data: mockSessions }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockUnit: Unit = {
  id: 42,
  faction_id: 1,
  name: "Intercessor Squad",
  category: null,
  unit_type: null,
  model_count: 5,
  owned_count: null,
  points: 90,
  status_assembly: 1,
  status_painting: "Base Coated",
  painting_percentage: 40,
  status_basing: 0,
  status_varnished: 0,
  is_active_project: 1,
  priority: null,
  target_completion_date: null,
  purchase_date: null,
  purchase_price_pence: null,
  storage_location: null,
  main_image_path: null,
  notes: null,
  lore_notes: null,
  undercoat: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-05-01 00:00:00",
};

// Used by vi.mock factory above (captured by closure)
let mockUnits: Unit[] = [mockUnit];

const mockFaction: Faction = {
  id: 1,
  name: "Space Marines",
  game_system: "Warhammer 40K",
  description: null,
  color_theme: "#1e3a5f",
  icon_path: null,
  lore_notes: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

function makeRecipe(over: Partial<PaintingRecipe> = {}): PaintingRecipe {
  return {
    id: 1,
    name: "Ultramarines Blue Scheme",
    faction_id: mockFaction.id,
    unit_id: mockUnit.id,
    area: "Armour",
    primer: null,
    basecoat: null,
    shade: null,
    layer: null,
    highlight: null,
    glaze_filter: null,
    weathering: null,
    technical: null,
    basing: null,
    tutorial_link: null,
    notes: null,
    style: null,
    surface: null,
    effect: null,
    difficulty: null,
    estimated_minutes: null,
    result_photo_path: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function makeStep(over: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 1,
    paint_id: 1,
    step_name: "Basecoat",
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
    created_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function renderSheet(recipe: PaintingRecipe | null) {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  render(
    <RecipeDetailSheet
      open={true}
      recipe={recipe}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
  );
  return { onClose, onEdit, onDelete, onDuplicate };
}

// ---------------------------------------------------------------------------
// DATA-05 tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — DATA-05 (unit link navigation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
    mockSteps = [];
    mockPaints = [];
    mockWishlistItems = [];
    mockSessions = [];
  });

  describe("linked unit display", () => {
    it("renders a Button with variant='link' when recipe has a linked unit", () => {
      renderSheet(makeRecipe());

      // Button should be present (not a plain span)
      const button = screen.getByRole("button", { name: mockUnit.name });
      expect(button).toBeInTheDocument();
    });

    it("Button text matches the unit name", () => {
      renderSheet(makeRecipe());

      const button = screen.getByRole("button", { name: "Intercessor Squad" });
      expect(button).toHaveTextContent("Intercessor Squad");
    });

    it("clicking the Button calls onClose then navigates to /collection", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSheet(makeRecipe());

      const button = screen.getByRole("button", { name: mockUnit.name });
      await user.click(button);

      expect(onClose).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
    });
  });

  describe("no linked unit", () => {
    it("renders a dash span when recipe has no linked unit (unit_id null)", () => {
      renderSheet(makeRecipe({ unit_id: null }));

      // Should render a dash, not a button
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("does NOT render a Button when unit is null", () => {
      renderSheet(makeRecipe({ unit_id: null }));

      // Only the Edit Recipe and Delete Recipe buttons should exist, not the unit button
      const buttons = screen.getAllByRole("button");
      const unitButton = buttons.find((b) => b.textContent === mockUnit.name);
      expect(unitButton).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// STUDIO-02 — RecipeDetailSheet timeline and metadata badge tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — STUDIO-02 (timeline and metadata badges)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
    mockSteps = [];
    mockPaints = [];
    mockWishlistItems = [];
    mockSessions = [];
  });

  describe("metadata badge row", () => {
    it("renders metadata badge row when recipe has surface", () => {
      renderSheet(makeRecipe({ surface: "Armor" }));
      expect(screen.getByTestId("recipe-metadata")).toBeInTheDocument();
      expect(screen.getByText("Armor")).toBeInTheDocument();
    });

    it("renders style badge in metadata row", () => {
      renderSheet(makeRecipe({ style: "Battle Ready" }));
      expect(screen.getByText("Battle Ready")).toBeInTheDocument();
    });

    it("renders difficulty badge with correct text", () => {
      renderSheet(makeRecipe({ difficulty: "Beginner" }));
      expect(screen.getByText("Beginner")).toBeInTheDocument();
    });

    it("renders estimated time badge with '45 min' format", () => {
      renderSheet(makeRecipe({ estimated_minutes: 45 }));
      expect(screen.getByText("45 min")).toBeInTheDocument();
    });

    it("does not render metadata row when all metadata fields are null", () => {
      renderSheet(makeRecipe({
        style: null, surface: null, effect: null, difficulty: null, estimated_minutes: null,
      }));
      expect(screen.queryByTestId("recipe-metadata")).not.toBeInTheDocument();
    });
  });

  describe("recipe steps timeline", () => {
    it("renders step-timeline testid when steps exist", () => {
      mockSteps = [makeStep()];
      renderSheet(makeRecipe());
      expect(screen.getByTestId("step-timeline")).toBeInTheDocument();
    });

    it("renders 'No steps added yet.' when steps array is empty", () => {
      mockSteps = [];
      renderSheet(makeRecipe());
      expect(screen.getByText("No steps added yet.")).toBeInTheDocument();
    });

    it("step-timeline not shown when steps is empty", () => {
      mockSteps = [];
      renderSheet(makeRecipe());
      expect(screen.queryByTestId("step-timeline")).not.toBeInTheDocument();
    });
  });

  describe("preserved fields", () => {
    it("still renders Linked Unit field", () => {
      renderSheet(makeRecipe());
      expect(screen.getByRole("button", { name: mockUnit.name })).toBeInTheDocument();
    });

    it("still renders Area field", () => {
      renderSheet(makeRecipe({ area: "Pauldrons" }));
      expect(screen.getByText("Pauldrons")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// STUDIO-03 — Recipe duplication button tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — STUDIO-03 (duplicate button)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
    mockSteps = [];
    mockPaints = [];
    mockWishlistItems = [];
    mockSessions = [];
    mockDuplicateMutateAsync.mockResolvedValue(99);
  });

  it("renders a Duplicate button in the footer", () => {
    renderSheet(makeRecipe());
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
  });

  it("calls useDuplicateRecipe with originalId and '(Copy)' suffix on click", async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 1, name: "Ultramarines Blue Scheme" });
    renderSheet(recipe);

    const btn = screen.getByRole("button", { name: /duplicate/i });
    await user.click(btn);

    expect(mockDuplicateMutateAsync).toHaveBeenCalledWith({
      originalId: 1,
      newName: "Ultramarines Blue Scheme (Copy)",
    });
  });

  it("calls onDuplicate callback with the new recipe id on success", async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 1, name: "Ultramarines Blue Scheme" });
    const { onDuplicate } = renderSheet(recipe);

    const btn = screen.getByRole("button", { name: /duplicate/i });
    await user.click(btn);

    expect(onDuplicate).toHaveBeenCalledWith(99);
  });
});

// ---------------------------------------------------------------------------
// PAINT-03 — "Add all missing to wishlist" button tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — PAINT-03 (add all missing to wishlist)", () => {
  const missingPaint: Paint = {
    id: 10,
    name: "Macragge Blue",
    brand: "Citadel",
    paint_type: "Base",
    color_family: null,
    hex_color: "#1e3a5f",
    owned: 0,
    quantity: null,
    running_low: 0,
    wishlist: 0,
    notes: null,
    purchase_price_pence: null,
    purchase_date: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
  };

  const ownedPaint: Paint = {
    id: 11,
    name: "Agrax Earthshade",
    brand: "Citadel",
    paint_type: "Shade",
    color_family: null,
    hex_color: "#5a4a2a",
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
    mockSteps = [];
    mockPaints = [];
    mockWishlistItems = [];
    mockSessions = [];
    mockCreateWishlistMutateAsync.mockResolvedValue(1);
  });

  it("shows 'Add all missing to wishlist' button when recipe has missing paints and a faction_id", () => {
    mockPaints = [missingPaint];
    mockSteps = [makeStep({ id: 1, paint_id: missingPaint.id })];
    renderSheet(makeRecipe({ faction_id: mockFaction.id }));

    expect(screen.getByRole("button", { name: /add all missing to wishlist/i })).toBeInTheDocument();
  });

  it("hides 'Add all missing to wishlist' button when all paints are owned", () => {
    mockPaints = [ownedPaint];
    mockSteps = [makeStep({ id: 1, paint_id: ownedPaint.id })];
    renderSheet(makeRecipe({ faction_id: mockFaction.id }));

    expect(screen.queryByRole("button", { name: /add all missing to wishlist/i })).not.toBeInTheDocument();
  });

  it("hides 'Add all missing to wishlist' button when recipe has no faction_id", () => {
    mockPaints = [missingPaint];
    mockSteps = [makeStep({ id: 1, paint_id: missingPaint.id })];
    renderSheet(makeRecipe({ faction_id: null }));

    expect(screen.queryByRole("button", { name: /add all missing to wishlist/i })).not.toBeInTheDocument();
  });

  it("hides 'Add all missing to wishlist' button when there are no steps", () => {
    mockPaints = [missingPaint];
    mockSteps = [];
    renderSheet(makeRecipe({ faction_id: mockFaction.id }));

    expect(screen.queryByRole("button", { name: /add all missing to wishlist/i })).not.toBeInTheDocument();
  });

  it("calls createWishlistItem.mutateAsync with correct args when button is clicked", async () => {
    const user = userEvent.setup();
    mockPaints = [missingPaint];
    mockSteps = [makeStep({ id: 1, paint_id: missingPaint.id })];
    mockWishlistItems = [];
    const recipe = makeRecipe({ faction_id: mockFaction.id, name: "Ultramarines Blue Scheme" });
    renderSheet(recipe);

    const btn = screen.getByRole("button", { name: /add all missing to wishlist/i });
    await user.click(btn);

    expect(mockCreateWishlistMutateAsync).toHaveBeenCalledWith({
      name: "Citadel Macragge Blue",
      faction_id: mockFaction.id,
      estimated_cost_pence: null,
      notes: "From recipe: Ultramarines Blue Scheme",
    });
  });
});

// ---------------------------------------------------------------------------
// PAINT-02 — RecipeStepTimeline "Alt:" display tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — PAINT-02 (alt paint display in timeline)", () => {
  const primaryPaint: Paint = {
    id: 20,
    name: "Macragge Blue",
    brand: "Citadel",
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

  const altPaint: Paint = {
    id: 21,
    name: "Kantor Blue",
    brand: "Citadel",
    paint_type: "Base",
    color_family: null,
    hex_color: "#0d2b47",
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
    mockSteps = [];
    mockPaints = [];
    mockWishlistItems = [];
    mockSessions = [];
  });

  it("renders alt-paint-display when step has alt_paint_id and the paint exists in paintMap", () => {
    mockPaints = [primaryPaint, altPaint];
    mockSteps = [makeStep({ id: 1, paint_id: primaryPaint.id, alt_paint_id: altPaint.id })];
    renderSheet(makeRecipe());

    expect(screen.getByTestId("alt-paint-display")).toBeInTheDocument();
  });

  it("alt-paint-display contains 'Alt:' prefix", () => {
    mockPaints = [primaryPaint, altPaint];
    mockSteps = [makeStep({ id: 1, paint_id: primaryPaint.id, alt_paint_id: altPaint.id })];
    renderSheet(makeRecipe());

    const el = screen.getByTestId("alt-paint-display");
    expect(el).toHaveTextContent("Alt:");
  });

  it("alt-paint-display shows the alt paint's brand and name", () => {
    mockPaints = [primaryPaint, altPaint];
    mockSteps = [makeStep({ id: 1, paint_id: primaryPaint.id, alt_paint_id: altPaint.id })];
    renderSheet(makeRecipe());

    const el = screen.getByTestId("alt-paint-display");
    expect(el).toHaveTextContent("Citadel Kantor Blue");
  });

  it("does NOT render alt-paint-display when step has no alt_paint_id", () => {
    mockPaints = [primaryPaint];
    mockSteps = [makeStep({ id: 1, paint_id: primaryPaint.id, alt_paint_id: null })];
    renderSheet(makeRecipe());

    expect(screen.queryByTestId("alt-paint-display")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// INTEG-02 — RecipeDetailSheet session history tests
// ---------------------------------------------------------------------------

describe("RecipeDetailSheet — INTEG-02 (session history)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [mockUnit];
    mockSteps = [];
    mockPaints = [];
    mockWishlistItems = [];
    mockSessions = [];
  });

  it("renders 'No sessions logged for this recipe yet' when sessions is empty", () => {
    mockSessions = [];
    renderSheet(makeRecipe());
    expect(screen.getByText("No sessions logged for this recipe yet")).toBeInTheDocument();
  });

  it("renders session rows with date, unit name, and duration when sessions exist", () => {
    mockSessions = [
      {
        id: 1,
        unit_id: mockUnit.id,
        session_date: "2026-05-07",
        duration_minutes: 45,
        notes: null,
        created_at: "2026-05-07",
        recipe_id: 1,
        recipe_step_id: null,
      },
    ];
    renderSheet(makeRecipe());

    const row = screen.getByTestId("recipe-session-row");
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent("2026-05-07");
    expect(row).toHaveTextContent("Intercessor Squad");
    expect(row).toHaveTextContent("45 min");
  });

  it("shows notes snippet when session has notes", () => {
    mockSessions = [
      {
        id: 2,
        unit_id: mockUnit.id,
        session_date: "2026-05-06",
        duration_minutes: 30,
        notes: "Applied two thin coats",
        created_at: "2026-05-06",
        recipe_id: 1,
        recipe_step_id: null,
      },
    ];
    renderSheet(makeRecipe());

    expect(screen.getByText("Applied two thin coats")).toBeInTheDocument();
  });

  it("shows 'Unknown unit' when unit_id does not match any unit", () => {
    mockUnits = []; // No units loaded
    mockSessions = [
      {
        id: 3,
        unit_id: 999,
        session_date: "2026-05-05",
        duration_minutes: 20,
        notes: null,
        created_at: "2026-05-05",
        recipe_id: 1,
        recipe_step_id: null,
      },
    ];
    renderSheet(makeRecipe());

    expect(screen.getByText(/Unknown unit/)).toBeInTheDocument();
  });

  it("renders multiple session rows", () => {
    mockSessions = [
      {
        id: 1,
        unit_id: mockUnit.id,
        session_date: "2026-05-07",
        duration_minutes: 45,
        notes: null,
        created_at: "2026-05-07",
        recipe_id: 1,
        recipe_step_id: null,
      },
      {
        id: 2,
        unit_id: mockUnit.id,
        session_date: "2026-05-06",
        duration_minutes: 30,
        notes: null,
        created_at: "2026-05-06",
        recipe_id: 1,
        recipe_step_id: null,
      },
    ];
    renderSheet(makeRecipe());

    const rows = screen.getAllByTestId("recipe-session-row");
    expect(rows).toHaveLength(2);
  });
});
