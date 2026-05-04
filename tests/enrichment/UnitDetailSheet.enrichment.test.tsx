/**
 * Phase 17 — UnitDetailSheet Details tab enrichment display tests (ENRCH-04).
 *
 * Verifies that the Undercoat and Lore Notes read-only rows render correctly
 * in the Details tab of UnitDetailSheet.
 *
 * Mock strategy mirrors JournalTab.test.tsx and PlaybookTab.test.tsx:
 * - vi.mock the data hooks to return deterministic synchronous data
 * - vi.mock Tauri plugins and heavy child tabs (JournalTab, PlaybookTab)
 * - vi.mock @tanstack/react-router (useNavigate)
 * - Render UnitDetailSheet with open={true} and a mock unit prop
 * - The Details tab is the defaultValue tab — renders immediately
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Unit } from "@/types/unit";

// ─── Stub Tauri plugin APIs (not available in jsdom) ─────────────────────────
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  BaseDirectory: { AppData: "AppData" },
}));

// ─── Stub router (UnitDetailSheet calls useNavigate internally) ───────────────
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

// ─── Stub data hooks to resolve synchronously ─────────────────────────────────
vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUpdateUnit: () => ({ mutate: vi.fn(), isPending: false }),
  UNITS_KEY: ["units"],
}));

// ─── Stub heavy child tabs that require their own IPC mocks ───────────────────
vi.mock("@/features/units/PlaybookTab", () => ({
  PlaybookTab: () => <div data-testid="playbook-tab-stub" />,
}));

vi.mock("@/features/units/JournalTab", () => ({
  JournalTab: () => <div data-testid="journal-tab-stub" />,
}));

vi.mock("@/features/units/StatusPopover", () => ({
  StatusPopover: () => <span data-testid="status-popover-stub" />,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { UnitDetailSheet } from "@/features/units/UnitDetailSheet";

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Tactical Squad",
    category: "Troops",
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: null,
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
    created_at: "2026-05-04",
    updated_at: "2026-05-04",
    ...over,
  };
}

function renderSheet(unit: Unit) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UnitDetailSheet
        open={true}
        unit={unit}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPhotoClick={vi.fn()}
      />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UnitDetailSheet — ENRCH-04 enrichment display", () => {
  it("renders Undercoat value when unit.undercoat is set", () => {
    renderSheet(makeUnit({ undercoat: "Chaos Black" }));
    // The "UNDERCOAT" label (uppercase via CSS but accessible as text)
    expect(screen.getByText("Undercoat")).toBeInTheDocument();
    expect(screen.getByText("Chaos Black")).toBeInTheDocument();
  });

  it("renders '—' for Undercoat when unit.undercoat is null", () => {
    renderSheet(makeUnit({ undercoat: null }));
    expect(screen.getByText("Undercoat")).toBeInTheDocument();
    // The muted fallback dash — rendered inside a muted-foreground span
    // We use getAllByText since other fields may also show '—'
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Lore Notes content when unit.lore_notes is set", () => {
    const loreContent = "Veterans of the Siege of Vraks.\nBattle-scarred survivors.";
    renderSheet(makeUnit({ lore_notes: loreContent }));
    expect(screen.getByText("Lore Notes")).toBeInTheDocument();
    // whitespace-pre-wrap preserves \n in the DOM text node; use a function matcher
    // to avoid testing-library's default whitespace normalization stripping it.
    const loreEl = screen.getByText((_, element) =>
      element?.tagName === "P" && element.textContent === loreContent
    );
    expect(loreEl).toBeInTheDocument();
  });

  it("does not render Lore Notes section when unit.lore_notes is null", () => {
    renderSheet(makeUnit({ lore_notes: null }));
    expect(screen.queryByText("Lore Notes")).toBeNull();
  });
});
