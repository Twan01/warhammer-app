/**
 * PANEL-01: CurrentFocusCard displays photo thumbnail, unit name, faction name,
 * model count, points (null-safe), and painting progress.
 * PANEL-02: CurrentFocusCard exposes Open (ExternalLink) and Log (Paintbrush)
 * ghost action buttons wired to onOpen / onLog callbacks.
 *
 * Props-based component — no QueryClient, no router, no context needed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrentFocusCard } from "@/features/dashboard/CurrentFocusCard";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

// CurrentFocusCard renders UnitThumbnail which imports from @/hooks/useUnitPhotos.
// Prevent the real hook from firing (it calls Tauri APIs).
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
    updated_at: "2026-05-01 00:00:00",
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

function makePhoto(over: Partial<UnitPhotoWithUrl> = {}): UnitPhotoWithUrl {
  return {
    id: 1,
    unit_id: 1,
    file_path: "photos/fire-warrior.jpg",
    caption: null,
    taken_at: null,
    created_at: "2026-05-01 00:00:00",
    assetUrl: "asset://localhost/photos/fire-warrior.jpg",
    ...over,
  } as UnitPhotoWithUrl;
}

// ---------------------------------------------------------------------------
// PANEL-01: photo and metadata
// ---------------------------------------------------------------------------

describe("CurrentFocusCard", () => {
  describe("PANEL-01: photo and metadata", () => {
    it("renders UnitThumbnail with size md when unit exists", () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const photo = makePhoto();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={photo}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Photo renders as an img element when photo prop is present
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      // Size md class: w-20 h-20
      expect(img.className).toContain("w-20");
      expect(img.className).toContain("h-20");
    });

    it("displays unit name", () => {
      const unit = makeUnit({ name: "Crisis Battlesuit" });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("Crisis Battlesuit")).toBeInTheDocument();
    });

    it("displays faction name", () => {
      const unit = makeUnit();
      const faction = makeFaction({ name: "T'au Empire" });

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("T'au Empire")).toBeInTheDocument();
    });

    it("displays model count with null-safe fallback", () => {
      const unit = makeUnit({ model_count: null });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Null model count renders as "---"
      expect(screen.getByText(/--- models/)).toBeInTheDocument();
    });

    it("displays points with null-safe fallback", () => {
      const unit = makeUnit({ points: null });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Null points renders as "---"
      expect(screen.getByText(/--- pts/)).toBeInTheDocument();
    });

    it("displays painting progress percentage", () => {
      const unit = makeUnit({ painting_percentage: 65 });
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.getByText("65% painted")).toBeInTheDocument();
    });

    it("renders progress bar with correct width", () => {
      const unit = makeUnit({ painting_percentage: 42 });
      const faction = makeFaction();

      const { container } = render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      // Progress bar fill div has inline width style
      const fills = container.querySelectorAll("[style*='width']");
      const progressFill = Array.from(fills).find(
        (el) => (el as HTMLElement).style.width === "42%"
      );
      expect(progressFill).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PANEL-02: action buttons
  // ---------------------------------------------------------------------------

  describe("PANEL-02: action buttons", () => {
    it("renders Open button with ExternalLink icon", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      const openButton = screen.getByRole("button", { name: /Open/i });
      expect(openButton).toBeInTheDocument();
      // ExternalLink renders as SVG inside the button
      const svg = openButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders Log button with Paintbrush icon", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      const logButton = screen.getByRole("button", { name: /Log/i });
      expect(logButton).toBeInTheDocument();
      const svg = logButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("calls onOpen when Open button is clicked", async () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const onOpen = vi.fn();
      const user = userEvent.setup();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={onOpen}
          onLog={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /Open/i }));

      expect(onOpen).toHaveBeenCalledOnce();
    });

    it("calls onLog when Log button is clicked", async () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const onLog = vi.fn();
      const user = userEvent.setup();

      render(
        <CurrentFocusCard
          unit={unit}
          faction={faction}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={onLog}
        />
      );

      await user.click(screen.getByRole("button", { name: /Log/i }));

      expect(onLog).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("shows empty state when unit is null", () => {
      render(
        <CurrentFocusCard
          unit={null}
          faction={undefined}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(
        screen.getByText(/No active project/i)
      ).toBeInTheDocument();
    });

    it("does not render action buttons when unit is null", () => {
      render(
        <CurrentFocusCard
          unit={null}
          faction={undefined}
          photo={undefined}
          onOpen={vi.fn()}
          onLog={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /Open/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Log/i })).toBeNull();
    });
  });
});
