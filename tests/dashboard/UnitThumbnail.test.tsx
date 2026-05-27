/**
 * PHOTO-01: UnitThumbnail renders an img element when a photo is provided.
 * PHOTO-02: UnitThumbnail renders a faction-colored Swords fallback when there
 * is no photo or when the image fails to load.
 *
 * The component is a pure presentational component that receives all data as
 * props â€” no hooks, no context, no QueryClient wrapper needed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnitThumbnail } from "@/components/common/UnitThumbnail";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

// UnitPhotoWithUrl is returned by the real hook which calls Tauri APIs.
// In tests we only need the fields UnitThumbnail actually reads (assetUrl).
vi.mock("@/hooks/useUnitPhotos", () => ({
  useLatestUnitPhotos: vi.fn().mockReturnValue({ data: new Map() }),
}));

// ---------------------------------------------------------------------------
// Shared test fixtures
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
    status_painting: "Completed",
    painting_percentage: 75,
    status_basing: 1,
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
// PHOTO-01: photo rendering
// ---------------------------------------------------------------------------

describe("UnitThumbnail", () => {
  describe("PHOTO-01: photo rendering", () => {
    it("renders img tag when photo is provided", () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const photo = makePhoto();

      render(<UnitThumbnail photo={photo} unit={unit} faction={faction} size="md" />);

      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
    });

    it("sets correct src from photo.assetUrl", () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const photo = makePhoto({ assetUrl: "asset://localhost/photos/fire-warrior.jpg" });

      render(<UnitThumbnail photo={photo} unit={unit} faction={faction} size="md" />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "asset://localhost/photos/fire-warrior.jpg");
    });

    it("sets alt text from unit name", () => {
      const unit = makeUnit({ name: "Crisis Suit" });
      const faction = makeFaction();
      const photo = makePhoto();

      render(<UnitThumbnail photo={photo} unit={unit} faction={faction} size="md" />);

      const img = screen.getByRole("img", { name: "Crisis Suit photo" });
      expect(img).toBeInTheDocument();
    });

    it("applies object-cover and rounded-lg classes", () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const photo = makePhoto();

      render(<UnitThumbnail photo={photo} unit={unit} faction={faction} size="md" />);

      const img = screen.getByRole("img");
      expect(img.className).toContain("object-cover");
      expect(img.className).toContain("rounded-lg");
    });
  });

  // ---------------------------------------------------------------------------
  // PHOTO-02: fallback rendering
  // ---------------------------------------------------------------------------

  describe("PHOTO-02: fallback rendering", () => {
    it("renders fallback div when no photo is provided", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      const { container } = render(
        <UnitThumbnail photo={undefined} unit={unit} faction={faction} size="md" />
      );

      // When no photo, there should be no img element
      expect(screen.queryByRole("img")).toBeNull();
      // The fallback div is aria-hidden
      const fallback = container.querySelector("[aria-hidden='true']");
      expect(fallback).toBeInTheDocument();
    });

    it("renders fallback div when photo load fails (onError)", () => {
      const unit = makeUnit();
      const faction = makeFaction();
      const photo = makePhoto();

      const { container } = render(
        <UnitThumbnail photo={photo} unit={unit} faction={faction} size="md" />
      );

      // Initially the img is present
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();

      // Simulate image load failure
      fireEvent.error(img);

      // After error, img is replaced by fallback div
      expect(screen.queryByRole("img")).toBeNull();
      const fallback = container.querySelector("[aria-hidden='true']");
      expect(fallback).toBeInTheDocument();
    });

    it("uses faction color_theme as background color", () => {
      const unit = makeUnit();
      const faction = makeFaction({ color_theme: "#3a4f96" });

      const { container } = render(
        <UnitThumbnail photo={undefined} unit={unit} faction={faction} size="md" />
      );

      const fallback = container.querySelector("[aria-hidden='true']") as HTMLElement;
      expect(fallback).toBeInTheDocument();
      expect(fallback.style.backgroundColor).toBe("rgb(58, 79, 150)");
    });

    it("uses muted color when no faction provided", () => {
      const unit = makeUnit();

      const { container } = render(
        <UnitThumbnail photo={undefined} unit={unit} faction={undefined} size="md" />
      );

      const fallback = container.querySelector("[aria-hidden='true']") as HTMLElement;
      expect(fallback).toBeInTheDocument();
      // Without faction, falls back to CSS variable string
      expect(fallback.style.backgroundColor).toBe("hsl(var(--muted))");
    });

    it("renders Swords icon in fallback", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      const { container } = render(
        <UnitThumbnail photo={undefined} unit={unit} faction={faction} size="md" />
      );

      // Swords icon renders as an SVG inside the fallback div
      const fallback = container.querySelector("[aria-hidden='true']");
      expect(fallback).toBeInTheDocument();
      const svg = fallback!.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Size variants
  // ---------------------------------------------------------------------------

  describe("size variants", () => {
    it("renders at sm size (w-11 h-11) for compact rows", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      const { container } = render(
        <UnitThumbnail photo={undefined} unit={unit} faction={faction} size="sm" />
      );

      const fallback = container.querySelector("[aria-hidden='true']") as HTMLElement;
      expect(fallback.className).toContain("w-11");
      expect(fallback.className).toContain("h-11");
    });

    it("renders at md size (w-20 h-20) for hero card", () => {
      const unit = makeUnit();
      const faction = makeFaction();

      const { container } = render(
        <UnitThumbnail photo={undefined} unit={unit} faction={faction} size="md" />
      );

      const fallback = container.querySelector("[aria-hidden='true']") as HTMLElement;
      expect(fallback.className).toContain("w-20");
      expect(fallback.className).toContain("h-20");
    });
  });
});
