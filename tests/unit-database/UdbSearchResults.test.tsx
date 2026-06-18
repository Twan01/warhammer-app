/**
 * Phase 138-03 PLAY-04 D-07: UdbSearchResults ownership badge tests.
 *
 * Verifies that UdbSearchResults:
 * - Renders "Owned x{n}" badge for results that have an entry in ownershipAllMap
 * - Does NOT render badge for results with no entry in ownershipAllMap
 * - Renders badge as a link to /collection (stopPropagation so parent click still works)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UdbSearchResults } from "@/features/unit-database/UdbSearchResults";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseUdbSearch = vi.fn();

vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbSearch: (...args: unknown[]) => mockUseUdbSearch(...args),
}));

// Mock Link from @tanstack/react-router — renders as <a> with href
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    onClick,
    "aria-label": ariaLabel,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: (e: React.MouseEvent) => void;
    "aria-label"?: string;
    [key: string]: unknown;
  }) => (
    <a href={to} onClick={onClick} aria-label={ariaLabel} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock collectionFilters so useCollectionFilters works without a provider
vi.mock("@/features/units/collectionFilters", () => ({
  useCollectionFilters: (selector: (s: { setUdbUnitIdFilter: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setUdbUnitIdFilter: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_RESULTS = [
  {
    unit_id: "u1",
    name: "Intercessors",
    faction_name: "Space Marines",
    keywords: "Infantry, Primaris",
  },
  {
    unit_id: "u2",
    name: "Necron Warriors",
    faction_name: "Necrons",
    keywords: "Infantry",
  },
];

beforeEach(() => {
  mockUseUdbSearch.mockReset();
  mockUseUdbSearch.mockReturnValue({ data: MOCK_RESULTS, isLoading: false });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UdbSearchResults", () => {
  it("renders unit names from search results", () => {
    render(
      <UdbSearchResults
        query="intercessor"
        onSelectResult={() => {}}
      />,
    );
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Necron Warriors")).toBeInTheDocument();
  });

  it("renders 'Owned x{n}' badge when ownershipAllMap has an entry for the result", () => {
    const ownershipAllMap = new Map([
      ["u1", { owned_count: 3, all_statuses: "Built|Primed|Completed" }],
    ]);

    render(
      <UdbSearchResults
        query="unit"
        onSelectResult={() => {}}
        ownershipAllMap={ownershipAllMap}
      />,
    );

    expect(screen.getByText("Owned x3")).toBeInTheDocument();
  });

  it("does NOT render badge when ownershipAllMap has no entry for the result", () => {
    const ownershipAllMap = new Map<string, { owned_count: number; all_statuses: string }>();

    render(
      <UdbSearchResults
        query="unit"
        onSelectResult={() => {}}
        ownershipAllMap={ownershipAllMap}
      />,
    );

    expect(screen.queryByText(/Owned x/)).not.toBeInTheDocument();
  });

  it("does NOT render badge when ownershipAllMap is not provided", () => {
    render(
      <UdbSearchResults
        query="unit"
        onSelectResult={() => {}}
      />,
    );

    expect(screen.queryByText(/Owned x/)).not.toBeInTheDocument();
  });

  it("renders badge only for the result that is in ownershipAllMap", () => {
    const ownershipAllMap = new Map([
      ["u2", { owned_count: 1, all_statuses: "Not Started" }],
    ]);

    render(
      <UdbSearchResults
        query="unit"
        onSelectResult={() => {}}
        ownershipAllMap={ownershipAllMap}
      />,
    );

    // Only u2 (Necron Warriors) has an entry
    expect(screen.getByText("Owned x1")).toBeInTheDocument();
    // u1 (Intercessors) should not show a badge
    expect(screen.queryByText("Owned x3")).not.toBeInTheDocument();
  });

  it("owned badge is rendered as a link to /collection", () => {
    const ownershipAllMap = new Map([
      ["u1", { owned_count: 2, all_statuses: "Built|Built" }],
    ]);

    render(
      <UdbSearchResults
        query="unit"
        onSelectResult={() => {}}
        ownershipAllMap={ownershipAllMap}
      />,
    );

    const badge = screen.getByText("Owned x2");
    const link = badge.closest("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/collection");
  });
});
