/**
 * FORM-01, FORM-02 — RecipeSectionCard and RecipeSectionList component behavior.
 *
 * Gap 1 (FORM-01): Collapsible section expand/collapse — clicking the collapse
 *   chevron toggles content (RecipeStepList) visibility.
 *
 * Gap 2 (FORM-02): Section CRUD —
 *   - Changing section name input calls onChange with updated name
 *   - Deleting an empty section calls onRemove directly (no dialog)
 *   - Deleting a non-empty section opens AlertDialog confirmation
 *   - RecipeSectionList: renders multiple section cards, onRemove propagates
 *
 * Mocks @dnd-kit/sortable + @dnd-kit/core (no pointer events in jsdom),
 * RecipeStepList (to isolate the card from DB hooks), and PaintCombobox.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DraftSection } from "@/features/recipes/recipeSection";

// ---------------------------------------------------------------------------
// Mock @dnd-kit/sortable — useSortable calls pointer APIs not available in jsdom
// ---------------------------------------------------------------------------
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: {},
  arrayMove: vi.fn((arr: unknown[], oldIndex: number, newIndex: number) => {
    const next = [...arr];
    const [item] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, item);
    return next;
  }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// ---------------------------------------------------------------------------
// Mock RecipeStepList — isolates RecipeSectionCard from all DB hooks
// ---------------------------------------------------------------------------
vi.mock("@/features/recipes/RecipeStepList", () => ({
  RecipeStepList: ({ steps }: { steps: unknown[] }) => (
    <div data-testid="recipe-step-list" data-step-count={steps.length} />
  ),
}));

// ---------------------------------------------------------------------------
// Import components under test (after mocks)
// ---------------------------------------------------------------------------
import { RecipeSectionCard } from "@/features/recipes/RecipeSectionCard";
import { RecipeSectionList } from "@/features/recipes/RecipeSectionList";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSection(over: Partial<DraftSection> = {}): DraftSection {
  return {
    localId: "local-sec-001",
    name: "Armor",
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
    ...over,
  };
}

function makeDraftStep(localId: string) {
  return {
    localId,
    step_name: "Base coat",
    paint_id: 1,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
  };
}

function renderCard(section: DraftSection, overrides: {
  onChange?: (s: DraftSection) => void;
  onRemove?: () => void;
  onCreateNewPaint?: (id: string) => void;
} = {}) {
  const onChange = overrides.onChange ?? vi.fn();
  const onRemove = overrides.onRemove ?? vi.fn();
  const onCreateNewPaint = overrides.onCreateNewPaint ?? vi.fn();
  const utils = render(
    <RecipeSectionCard
      section={section}
      onChange={onChange}
      onRemove={onRemove}
      onCreateNewPaint={onCreateNewPaint}
    />
  );
  return { ...utils, onChange, onRemove, onCreateNewPaint };
}

// ---------------------------------------------------------------------------
// Helpers to locate specific header buttons
// The header row contains:
//   1. Drag handle button (aria-label="Drag section")
//   2. Collapse trigger button (ChevronDown icon, no accessible name)
//   3. Delete button (has class "text-destructive")
// ---------------------------------------------------------------------------

function getCollapseBtn(container: HTMLElement) {
  // The collapse trigger is a ghost icon button that is NOT the drag handle
  // and does NOT have the text-destructive class.
  // It is identifiable as a data-slot="collapsible-trigger" descendant button
  // or as the button inside [data-slot="collapsible-trigger"]
  const triggerWrapper = container.querySelector("[data-slot='collapsible-trigger']");
  if (triggerWrapper) return triggerWrapper as HTMLElement;
  // Fallback: all icon buttons excluding drag handle and delete
  const allBtns = Array.from(container.querySelectorAll("button[type='button']")) as HTMLElement[];
  return allBtns.find(
    (b) =>
      b.getAttribute("aria-label") !== "Drag section" &&
      !b.classList.contains("text-destructive") &&
      b.querySelector("svg"),
  )!;
}

// ---------------------------------------------------------------------------
// Gap 1 (FORM-01) — Collapsible expand/collapse
// ---------------------------------------------------------------------------

describe("RecipeSectionCard — FORM-01 collapsible expand/collapse", () => {
  it("renders the step list (expanded by default)", () => {
    renderCard(makeSection());
    // RecipeStepList is rendered (mocked) — card starts open
    expect(screen.getByTestId("recipe-step-list")).toBeInTheDocument();
  });

  it("clicking the collapse chevron button hides the step list content", () => {
    const { container } = renderCard(makeSection());
    const collapseBtn = getCollapseBtn(container);
    expect(collapseBtn).toBeTruthy();
    // The collapse trigger toggles the Radix CollapsibleContent
    fireEvent.click(collapseBtn);
    // After collapse, Radix removes or hides CollapsibleContent
    expect(screen.queryByTestId("recipe-step-list")).not.toBeInTheDocument();
  });

  it("clicking collapse then clicking again re-expands and shows the step list", () => {
    const { container } = renderCard(makeSection());
    const collapseBtn = getCollapseBtn(container);
    // Collapse
    fireEvent.click(collapseBtn);
    expect(screen.queryByTestId("recipe-step-list")).not.toBeInTheDocument();
    // Re-expand
    fireEvent.click(collapseBtn);
    expect(screen.getByTestId("recipe-step-list")).toBeInTheDocument();
  });

  it("shows the step count badge when collapsed and steps exist", () => {
    const section = makeSection({ steps: [makeDraftStep("s1"), makeDraftStep("s2")] });
    const { container } = renderCard(section);
    // Initially expanded — badge should NOT appear
    expect(screen.queryByText(/2 steps/)).not.toBeInTheDocument();
    // Collapse
    const collapseBtn = getCollapseBtn(container);
    fireEvent.click(collapseBtn);
    // Badge appears when collapsed
    expect(screen.getByText("2 steps")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Gap 2 (FORM-02) — Section name change calls onChange
// ---------------------------------------------------------------------------

describe("RecipeSectionCard — FORM-02 section name inline edit", () => {
  it("renders a text input with the section name", () => {
    renderCard(makeSection({ name: "Cloth" }));
    const nameInput = screen.getByDisplayValue("Cloth");
    expect(nameInput).toBeInTheDocument();
  });

  it("changing the section name input calls onChange with updated name", () => {
    const onChange = vi.fn();
    const section = makeSection({ name: "Armor" });
    renderCard(section, { onChange });
    const nameInput = screen.getByDisplayValue("Armor");
    fireEvent.change(nameInput, { target: { value: "Skin" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Skin" }));
  });
});

// ---------------------------------------------------------------------------
// Gap 2 (FORM-02) — Delete empty section calls onRemove directly
// ---------------------------------------------------------------------------

describe("RecipeSectionCard — FORM-02 delete empty section", () => {
  it("renders the delete button", () => {
    renderCard(makeSection());
    // The Trash2 button is the last ghost/icon button in the header
    const deleteBtns = screen.getAllByRole("button");
    // At least one button should be present (drag, collapse, delete)
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking delete on an empty section calls onRemove immediately (no dialog)", () => {
    const onRemove = vi.fn();
    const section = makeSection({ steps: [] });
    renderCard(section, { onRemove });

    // Find the delete button (Trash2 icon button — it is the last icon button in header)
    // Query by finding buttons and picking the delete one (has class text-destructive)
    const { container } = renderCard(section, { onRemove });
    const deleteBtn = container.querySelector(".text-destructive");
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn!);
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("clicking delete on empty section does NOT open the AlertDialog", () => {
    const section = makeSection({ steps: [] });
    const { container } = renderCard(section);
    const deleteBtn = container.querySelector(".text-destructive");
    fireEvent.click(deleteBtn!);
    // AlertDialog content should not be visible
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Gap 2 (FORM-02) — Delete non-empty section shows AlertDialog confirmation
// ---------------------------------------------------------------------------

describe("RecipeSectionCard — FORM-02 delete non-empty section shows confirmation", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it("clicking delete on a non-empty section opens the AlertDialog", () => {
    const section = makeSection({ steps: [makeDraftStep("s1")] });
    const { container } = renderCard(section);
    const deleteBtn = container.querySelector(".text-destructive");
    fireEvent.click(deleteBtn!);
    // AlertDialog should now be open — Radix renders the dialog into the document
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("AlertDialog title includes the section name", () => {
    const section = makeSection({ name: "Armor", steps: [makeDraftStep("s1")] });
    const { container } = renderCard(section);
    const deleteBtn = container.querySelector(".text-destructive");
    fireEvent.click(deleteBtn!);
    expect(screen.getByText(/Delete section "Armor"/)).toBeInTheDocument();
  });

  it("AlertDialog description mentions the step count", () => {
    const section = makeSection({ steps: [makeDraftStep("s1"), makeDraftStep("s2")] });
    const { container } = renderCard(section);
    const deleteBtn = container.querySelector(".text-destructive");
    fireEvent.click(deleteBtn!);
    expect(screen.getByText(/2 steps/)).toBeInTheDocument();
  });

  it("clicking Cancel in AlertDialog does NOT call onRemove", () => {
    const onRemove = vi.fn();
    const section = makeSection({ steps: [makeDraftStep("s1")] });
    const { container } = renderCard(section, { onRemove });
    const deleteBtn = container.querySelector(".text-destructive");
    fireEvent.click(deleteBtn!);
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("clicking Delete in AlertDialog calls onRemove", () => {
    const onRemove = vi.fn();
    const section = makeSection({ steps: [makeDraftStep("s1")] });
    const { container } = renderCard(section, { onRemove });
    const deleteBtn = container.querySelector(".text-destructive");
    fireEvent.click(deleteBtn!);
    const confirmBtn = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(confirmBtn);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Gap 2 (FORM-02) — RecipeSectionList renders multiple sections
// ---------------------------------------------------------------------------

describe("RecipeSectionList — FORM-02 renders multiple sections", () => {
  function renderList(sections: DraftSection[], onChange = vi.fn()) {
    const onCreateNewPaint = vi.fn();
    const utils = render(
      <RecipeSectionList
        sections={sections}
        onChange={onChange}
        onCreateNewPaint={onCreateNewPaint}
      />
    );
    return { ...utils, onChange, onCreateNewPaint };
  }

  it("renders one card per section", () => {
    const sections = [
      makeSection({ localId: "sec-1", name: "Armor" }),
      makeSection({ localId: "sec-2", name: "Cloth" }),
    ];
    renderList(sections);
    expect(screen.getByDisplayValue("Armor")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cloth")).toBeInTheDocument();
  });

  it("removing a section calls onChange with the section filtered out", () => {
    const onChange = vi.fn();
    const sections = [
      makeSection({ localId: "sec-1", name: "Armor", steps: [] }),
      makeSection({ localId: "sec-2", name: "Cloth", steps: [] }),
    ];
    const { container } = renderList(sections, onChange);
    // Each card renders a .text-destructive delete button; pick the first one
    const deleteBtns = container.querySelectorAll(".text-destructive");
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);
    // Click delete on first card (empty section — calls onRemove directly)
    fireEvent.click(deleteBtns[0]);
    expect(onChange).toHaveBeenCalledOnce();
    const updatedSections: DraftSection[] = onChange.mock.calls[0][0];
    expect(updatedSections).toHaveLength(1);
    expect(updatedSections[0].localId).toBe("sec-2");
  });

  it("renders zero cards when sections array is empty", () => {
    const { container } = renderList([]);
    // No section name inputs should be rendered
    const inputs = container.querySelectorAll("input[type='text'], input:not([type])");
    expect(inputs).toHaveLength(0);
  });
});
