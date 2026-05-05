import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Tauri APIs — must be hoisted before the component import
const mockSetFullscreen = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setFullscreen: mockSetFullscreen }),
}));
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
}));

import { ShowcaseMode } from "@/features/units/ShowcaseMode";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeUnit(id: number, name: string, factionId = 1): Unit {
  return {
    id,
    faction_id: factionId,
    name,
    category: "Troops",
    unit_type: null,
    model_count: 5,
    owned_count: 5,
    points: 90,
    status_assembly: 1,
    status_painting: "Completed",
    painting_percentage: 100,
    status_basing: 1,
    status_varnished: 1,
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
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  };
}

function makeFaction(id: number, name: string): Faction {
  return {
    id,
    name,
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#1e40af",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  };
}

function makePhoto(unitId: number, assetUrl: string): UnitPhotoWithUrl {
  return {
    id: unitId,
    entity_type: "unit",
    entity_id: unitId,
    file_path: `photos/unit${unitId}.jpg`,
    stage_label: "Completed",
    caption: null,
    taken_at: null,
    assetUrl,
    created_at: "2026-05-01T00:00:00Z",
  };
}

// ── Test data ─────────────────────────────────────────────────────────────────

const faction1 = makeFaction(1, "Space Marines");
const faction2 = makeFaction(2, "Orks");

const unit1 = makeUnit(1, "Tactical Squad", 1);
const unit2 = makeUnit(2, "Assault Marines", 1);
const unit3 = makeUnit(3, "Boyz", 2);

const photo1 = makePhoto(1, "asset://localhost/unit1.jpg");
const photo2 = makePhoto(2, "asset://localhost/unit2.jpg");
const photo3 = makePhoto(3, "asset://localhost/unit3.jpg");

const twoUnits = [unit1, unit2];
const twoPhotos = new Map([
  [1, photo1],
  [2, photo2],
]);
const twoFactions = [faction1];

const threeUnits = [unit1, unit2, unit3];
const threePhotos = new Map([
  [1, photo1],
  [2, photo2],
  [3, photo3],
]);
const twoFactionsList = [faction1, faction2];

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSetFullscreen.mockClear();
});

describe("ShowcaseMode — full-screen gallery overlay (DISP-02/DISP-03)", () => {
  it("renders overlay with data-testid showcase-overlay", () => {
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("showcase-overlay")).toBeInTheDocument();
  });

  it("displays first unit name and faction", () => {
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Tactical Squad")).toBeInTheDocument();
    expect(screen.getByText("Space Marines")).toBeInTheDocument();
  });

  it("displays photo with correct src", () => {
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={vi.fn()}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "asset://localhost/unit1.jpg");
  });

  it("displays counter showing 1 of N", () => {
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("Escape key calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    // handleClose is async — wait for the promise to resolve
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("X button click calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Exit Showcase"));
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("ArrowRight advances to next unit", () => {
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Tactical Squad")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("Assault Marines")).toBeInTheDocument();
  });

  it("ArrowLeft wraps to last unit from first (signed modulo regression)", () => {
    render(
      <ShowcaseMode
        units={threeUnits}
        photos={threePhotos}
        factions={twoFactionsList}
        onClose={vi.fn()}
      />,
    );
    // Start at index 0 (unit1 = "Tactical Squad")
    expect(screen.getByText("Tactical Squad")).toBeInTheDocument();
    // ArrowLeft from 0 should wrap to index 2 (unit3 = "Boyz")
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("Boyz")).toBeInTheDocument();
  });

  it("calls setFullscreen(true) on mount", () => {
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={vi.fn()}
      />,
    );
    expect(mockSetFullscreen).toHaveBeenCalledWith(true);
  });

  it("calls setFullscreen(false) on close", async () => {
    const onClose = vi.fn();
    render(
      <ShowcaseMode
        units={twoUnits}
        photos={twoPhotos}
        factions={twoFactions}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Exit Showcase"));
    await vi.waitFor(() => {
      expect(mockSetFullscreen).toHaveBeenCalledWith(false);
    });
  });
});
