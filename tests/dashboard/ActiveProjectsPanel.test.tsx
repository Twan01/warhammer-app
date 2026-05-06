/**
 * PANEL-03: ActiveProjectsPanel renders up to 5 active project rows with
 * photo thumbnail, unit name, painting progress percentage, relative
 * last-updated date, and Open/Log ghost action buttons.
 *
 * Empty state: Target icon + guidance text when projects array is empty.
 *
 * Props-based component — no QueryClient, no router, no context needed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveProjectsPanel } from "@/features/dashboard/ActiveProjectsPanel";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

// ActiveProjectsPanel renders UnitThumbnail which imports from @/hooks/useUnitPhotos.
// Prevent real hook from firing (it calls Tauri APIs).
vi.mock("@/hooks/useUnitPhotos", () => ({
  useLatestUnitPhotos: vi.fn().mockReturnValue({ data: new Map() }),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Fire Warrior",
    category: null,
    unit_type: null,
    model_count: 10,
    owned_count: null,
    points: 100,
    status_assembly: 1,
    status_painting: "Highlighted",
    painting_percentage: 65,
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
    // Use a date far enough in the past to produce a stable "Xd ago" result.
    // 10 days ago relative to test execution will always render as "10d ago".
    updated_at: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 10);
      return d.toISOString().replace("T", " ").slice(0, 19);
    })(),
    ...over,
  };
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Space Marines",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#1e3a5f",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function makePhoto(unitId: number): UnitPhotoWithUrl {
  return {
    id: unitId,
    unit_id: unitId,
    file_path: `photos/unit-${unitId}.jpg`,
    caption: null,
    taken_at: null,
    created_at: "2026-05-01 00:00:00",
    assetUrl: `asset://localhost/photos/unit-${unitId}.jpg`,
  } as UnitPhotoWithUrl;
}

// ---------------------------------------------------------------------------
// PANEL-03: project rows
// ---------------------------------------------------------------------------

describe("ActiveProjectsPanel", () => {
  describe("PANEL-03: project rows", () => {
    it("renders up to 5 project rows", () => {
      const factions = [makeFaction()];
      // Provide 6 units — component should render all that are passed
      // (the slice to 5 happens in computeStats before passing props).
      // We test with 3 to verify the row count equals the projects length.
      const projects = [
        makeUnit({ id: 1, name: "Unit A" }),
        makeUnit({ id: 2, name: "Unit B" }),
        makeUnit({ id: 3, name: "Unit C" }),
      ];

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("Unit A")).toBeInTheDocument();
      expect(screen.getByText("Unit B")).toBeInTheDocument();
      expect(screen.getByText("Unit C")).toBeInTheDocument();
    });

    it("renders UnitThumbnail with size sm for each row", () => {
      const factions = [makeFaction()];
      const projects = [makeUnit({ id: 1, name: "Fire Warrior" })];
      const latestPhotos = new Map<number, UnitPhotoWithUrl>();
      latestPhotos.set(1, makePhoto(1));

      const { container } = render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={latestPhotos}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Photo present → img rendered at sm size (w-11 h-11)
      const img = screen.getByRole("img");
      expect(img.className).toContain("w-11");
      expect(img.className).toContain("h-11");
      void container; // suppress unused warning
    });

    it("displays unit name in each row", () => {
      const factions = [makeFaction()];
      const projects = [
        makeUnit({ id: 1, name: "Intercessor Squad" }),
        makeUnit({ id: 2, name: "Dreadnought" }),
      ];

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("Intercessor Squad")).toBeInTheDocument();
      expect(screen.getByText("Dreadnought")).toBeInTheDocument();
    });

    it("displays painting progress percentage in each row", () => {
      const factions = [makeFaction()];
      const projects = [makeUnit({ id: 1, painting_percentage: 42 })];

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText(/42% painted/)).toBeInTheDocument();
    });

    it("displays relative last-updated date in each row", () => {
      const factions = [makeFaction()];
      // 10 days ago → relativeDate returns "10d ago"
      const tenDaysAgo = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 10);
        return d.toISOString().replace("T", " ").slice(0, 19);
      })();
      const projects = [makeUnit({ id: 1, updated_at: tenDaysAgo })];

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText(/10d ago/)).toBeInTheDocument();
    });

    it("renders Open button for each row", () => {
      const factions = [makeFaction()];
      const projects = [
        makeUnit({ id: 1, name: "Unit A" }),
        makeUnit({ id: 2, name: "Unit B" }),
      ];

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      const openButtons = screen.getAllByRole("button", { name: /Open/i });
      expect(openButtons).toHaveLength(2);
    });

    it("renders Log button for each row", () => {
      const factions = [makeFaction()];
      const projects = [
        makeUnit({ id: 1, name: "Unit A" }),
        makeUnit({ id: 2, name: "Unit B" }),
      ];

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      const logButtons = screen.getAllByRole("button", { name: /Log/i });
      expect(logButtons).toHaveLength(2);
    });

    it("calls onOpen with unitId when Open is clicked", async () => {
      const factions = [makeFaction()];
      const projects = [makeUnit({ id: 42, name: "Crisis Suit" })];
      const onOpen = vi.fn();
      const user = userEvent.setup();

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={onOpen}
          onLog={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /Open/i }));

      expect(onOpen).toHaveBeenCalledOnce();
      expect(onOpen).toHaveBeenCalledWith(42);
    });

    it("calls onLog with unitId when Log is clicked", async () => {
      const factions = [makeFaction()];
      const projects = [makeUnit({ id: 7, name: "Riptide" })];
      const onLog = vi.fn();
      const user = userEvent.setup();

      render(
        <ActiveProjectsPanel
          projects={projects}
          factions={factions}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={onLog}
        />
      );

      await user.click(screen.getByRole("button", { name: /Log/i }));

      expect(onLog).toHaveBeenCalledOnce();
      expect(onLog).toHaveBeenCalledWith(7);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("shows empty state when no projects provided", () => {
      render(
        <ActiveProjectsPanel
          projects={[]}
          factions={[]}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(
        screen.getByText(/No active projects/i)
      ).toBeInTheDocument();
    });

    it("displays Target icon in empty state", () => {
      const { container } = render(
        <ActiveProjectsPanel
          projects={[]}
          factions={[]}
          latestPhotos={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Target icon is a Lucide SVG rendered aria-hidden next to the empty state text
      const emptyStateWrapper = screen.getByText(/No active projects/i).closest("div");
      expect(emptyStateWrapper).toBeInTheDocument();
      const svg = container.querySelector("svg[aria-hidden='true']");
      expect(svg).toBeInTheDocument();
    });
  });
});
