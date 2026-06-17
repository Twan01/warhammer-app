/**
 * Phase 133 — PointsFreshnessBadge dedicated behavioral tests (HON-01).
 *
 * Verifies honest-data-provenance guarantees:
 * - Renders "v{version}" label when udbMeta is present
 * - Renders "No data" fallback when udbMeta is null
 * - Renders a Skeleton (NOT the label text) when isLoading is true
 * - NEVER renders any colored freshness dot (bg-green-500 / bg-amber-500 / bg-red-500)
 *   — this is the core "honest, no fake sync status" contract
 *
 * Note: Radix Tooltip content does not render in jsdom without hover, so
 * tooltip-content assertions are intentionally skipped to avoid flakiness.
 * The trigger label, skeleton, and dot-absence assertions cover all
 * honest-provenance behavioral requirements.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UdbMeta } from "@/hooks/useUdbMeta";

// Controllable mock state — follows the exact idiom from DataHealthSummaryCard.test.tsx
let mockUdbMeta: UdbMeta | null = null;
let mockUdbLoading = false;

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: () => ({ data: mockUdbMeta, isLoading: mockUdbLoading }),
}));

// Import AFTER vi.mock so the hoisted mock is in place
import { PointsFreshnessBadge } from "@/features/army-lists/PointsFreshnessBadge";

function renderBadge() {
  return render(
    <TooltipProvider>
      <PointsFreshnessBadge />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUdbMeta = null;
  mockUdbLoading = false;
});

// ---------------------------------------------------------------------------
// HON-01: version label
// ---------------------------------------------------------------------------

describe("PointsFreshnessBadge — honest version label (HON-01)", () => {
  it("renders 'v{version}' text when udbMeta is present", () => {
    mockUdbMeta = {
      version: "1.0.0+a3f7bc21",
      built_at: "2026-06-01T12:00:00.000Z",
      game_system: "40k",
      unit_count: 120,
      faction_count: 15,
    };
    renderBadge();
    expect(screen.getByText("v1.0.0+a3f7bc21")).toBeInTheDocument();
  });

  it("renders the full version string verbatim including build hash suffix", () => {
    mockUdbMeta = {
      version: "2.3.1+deadbeef",
      built_at: "2026-06-10T08:00:00.000Z",
      game_system: "40k",
      unit_count: 200,
      faction_count: 20,
    };
    renderBadge();
    expect(screen.getByText("v2.3.1+deadbeef")).toBeInTheDocument();
  });

  it("renders 'No data' fallback when udbMeta is null", () => {
    mockUdbMeta = null;
    renderBadge();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("does NOT render 'No data' text when udbMeta is present", () => {
    mockUdbMeta = {
      version: "1.0.0+a3f7bc21",
      built_at: "2026-06-01T12:00:00.000Z",
      game_system: "40k",
      unit_count: 120,
      faction_count: 15,
    };
    renderBadge();
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// HON-01: loading state — skeleton, not label
// ---------------------------------------------------------------------------

describe("PointsFreshnessBadge — loading state (HON-01)", () => {
  it("renders a Skeleton element (animate-pulse) when isLoading is true", () => {
    mockUdbLoading = true;
    mockUdbMeta = null;
    renderBadge();
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("does NOT render the version label text when isLoading is true", () => {
    mockUdbLoading = true;
    mockUdbMeta = {
      version: "1.0.0+a3f7bc21",
      built_at: "2026-06-01T12:00:00.000Z",
      game_system: "40k",
      unit_count: 120,
      faction_count: 15,
    };
    renderBadge();
    // The label must be suppressed in favor of the skeleton
    expect(screen.queryByText("v1.0.0+a3f7bc21")).not.toBeInTheDocument();
  });

  it("does NOT render 'No data' text when isLoading is true", () => {
    mockUdbLoading = true;
    mockUdbMeta = null;
    renderBadge();
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// HON-01: no fake traffic-light freshness dot
// ---------------------------------------------------------------------------

describe("PointsFreshnessBadge — no colored freshness dot (HON-01 core guarantee)", () => {
  it("does NOT render a bg-green-500 dot when udbMeta is present", () => {
    mockUdbMeta = {
      version: "1.0.0+a3f7bc21",
      built_at: "2026-06-01T12:00:00.000Z",
      game_system: "40k",
      unit_count: 120,
      faction_count: 15,
    };
    renderBadge();
    expect(document.querySelector(".bg-green-500")).toBeNull();
  });

  it("does NOT render a bg-amber-500 dot under any data state", () => {
    mockUdbMeta = {
      version: "0.9.0+olddata",
      built_at: "2025-01-01T00:00:00.000Z",
      game_system: "40k",
      unit_count: 50,
      faction_count: 5,
    };
    renderBadge();
    expect(document.querySelector(".bg-amber-500")).toBeNull();
  });

  it("does NOT render a bg-red-500 dot when udbMeta is null", () => {
    mockUdbMeta = null;
    renderBadge();
    expect(document.querySelector(".bg-red-500")).toBeNull();
  });

  it("does NOT render a bg-green-500 dot during loading state", () => {
    mockUdbLoading = true;
    renderBadge();
    expect(document.querySelector(".bg-green-500")).toBeNull();
  });
});
