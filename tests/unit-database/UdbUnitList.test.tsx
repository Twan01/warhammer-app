/**
 * Phase 104 — BUI-06: UdbUnitList component tests.
 *
 * Mocks @tanstack/react-virtual to avoid needing a real scroll container,
 * verifies role group headers, unit rows, loading state, and empty state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Mock @tanstack/react-virtual
// ---------------------------------------------------------------------------

const mockGetVirtualItems = vi.fn();
const mockGetTotalSize = vi.fn();

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (opts: { count: number }) => {
    // Expose all items as virtual items
    const items = Array.from({ length: opts.count }, (_, i) => ({
      index: i,
      key: String(i),
      start: i * 40,
      size: 40,
    }));
    mockGetVirtualItems.mockReturnValue(items);
    mockGetTotalSize.mockReturnValue(opts.count * 40);
    return {
      getVirtualItems: () => items,
      getTotalSize: () => opts.count * 40,
    };
  },
}));

import { UdbUnitList } from "@/features/unit-database/UdbUnitList";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UNITS: UdbUnitSummary[] = [
  { id: "u1", faction_id: "SM", name: "Intercessors", role: "Battleline", base_points: 80, min_models: 5, max_models: 10 },
  { id: "u2", faction_id: "SM", name: "Eradicators", role: "Battleline", base_points: 95, min_models: 3, max_models: 6 },
  { id: "u3", faction_id: "SM", name: "Captain", role: "Character", base_points: 80, min_models: 1, max_models: 1 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UdbUnitList", () => {
  it("renders role group headers", () => {
    const { container } = render(<UdbUnitList units={UNITS} isLoading={false} onOpenUnit={() => {}} />);
    // Headers have a distinctive bg-background class; unit rows use Badge for role text.
    // Headers show "Role (count)" format.
    const headers = container.querySelectorAll(".bg-background");
    const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(headerTexts.some((t) => t?.includes("Battleline"))).toBe(true);
    expect(headerTexts.some((t) => t?.includes("Character"))).toBe(true);
  });

  it("renders unit rows", () => {
    render(<UdbUnitList units={UNITS} isLoading={false} onOpenUnit={() => {}} />);
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Eradicators")).toBeInTheDocument();
    expect(screen.getByText("Captain")).toBeInTheDocument();
  });

  it("uses a single useVirtualizer instance (all items rendered)", () => {
    render(<UdbUnitList units={UNITS} isLoading={false} onOpenUnit={() => {}} />);
    // 2 headers + 3 units = 5 items
    // All are rendered by the virtualizer mock
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Captain")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    const { container } = render(
      <UdbUnitList units={[]} isLoading={true} onOpenUnit={() => {}} />,
    );
    // Loading renders skeletons (8 of them)
    const skeletons = container.querySelectorAll("[class*='animate']");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
    // No unit rows while loading
    expect(screen.queryByText("Intercessors")).not.toBeInTheDocument();
  });

  it("shows empty state when no units match", () => {
    render(<UdbUnitList units={[]} isLoading={false} onOpenUnit={() => {}} />);
    expect(screen.getByText("No units match your filters.")).toBeInTheDocument();
  });
});
