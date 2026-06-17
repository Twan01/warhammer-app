/**
 * NAV-03 — Rules Hub ↔ Unit Database bidirectional cross-links.
 *
 * Behaviors:
 *   - RulesHubPage renders a link to /unit-database ("Browse Units")
 *   - DatabaseBrowserPage renders a link to /rules-hub ("View Rules")
 *
 * Mirrors tests/rules-hub/RulesHubPage.test.tsx for RulesHubPage mock setup.
 * DatabaseBrowserPage needs its own full set of hook stubs.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode, ReactElement } from "react";

// ---------------------------------------------------------------------------
// Shared router mock — Link renders as <a> with href
// ---------------------------------------------------------------------------
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

// DatabaseBrowserPage reads ?udbUnitId via unitDatabaseRoute.useSearch (WR-01).
// Mock the route so importing the real router tree (lazy imports, devtools) is
// avoided in jsdom.
vi.mock("@/app/router", () => ({
  unitDatabaseRoute: {
    useSearch: () => ({ udbUnitId: undefined }),
  },
}));

// ---------------------------------------------------------------------------
// RulesHubPage mocks (mirrors rules-hub/RulesHubPage.test.tsx)
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({
    data: [{ id: 1, name: "Space Marines", color_theme: "#000", icon_path: null, game_system: "40k", description: null, created_at: "", updated_at: "" }],
  })),
  useUpdateFaction: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useWahapediaFactions: vi.fn(() => ({ data: [] })),
  RULES_SYNC_META_KEY: ["rules-sync-meta"],
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(() => ({
    data: { built_at: "2026-05-09T10:00:00Z", version: "1.0" },
  })),
}));

vi.mock("@/hooks/useRulesFavorites", () => ({
  useRulesFavorites: vi.fn(() => ({ data: [] })),
  useUpsertRulesFavorite: () => ({ mutate: vi.fn() }),
  useDeleteRulesFavorite: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useRulesNotes: vi.fn(() => ({ data: [] })),
  useUpsertRulesNote: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/db/queries/armyLists", () => ({
  getArmyListUnitNames: vi.fn(async () => []),
}));

vi.mock("@/hooks/useGameData", () => ({
  useStratagemsByFaction: vi.fn(() => ({ data: [], isLoading: false })),
  useDetachmentsByFaction: vi.fn(() => ({ data: [], isLoading: false })),
  useDetachmentAbilities: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/features/rules-hub/rulesHubFilters", () => ({
  useRulesHubFilters: () => ({
    selectedFactionId: null,
    searchText: "",
    phaseFilter: null,
    cpFilter: null,
    setSelectedFactionId: vi.fn(),
    setSearchText: vi.fn(),
    setPhaseFilter: vi.fn(),
    setCpFilter: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// DatabaseBrowserPage mocks
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbFactions: vi.fn(() => ({ data: [], isLoading: false })),
  useUdbUnits: vi.fn(() => ({ data: [], isLoading: false })),
  useUdbOwnership: vi.fn(() => ({ data: [] })),
  useUdbUnitOwnership: vi.fn(() => ({ data: undefined })),
  useUdbKeywords: vi.fn(() => ({ data: undefined })),
  useUdbSubFactions: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/features/unit-database/databaseBrowserFilters", () => ({
  useDatabaseBrowserFilters: () => ({
    selectedFactionId: null,
    searchText: "",
    subFactionFilter: null,
    roleFilter: null,
    keywordFilter: null,
    pointMin: null,
    pointMax: null,
    setSelectedFactionId: vi.fn(),
    setSearchText: vi.fn(),
  }),
}));

vi.mock("@/features/unit-database/applyUdbFilters", () => ({
  applyUdbFilters: (_units: any[]) => [],
}));

vi.mock("@/features/unit-database/FactionPicker", () => ({
  FactionPicker: () => <div data-testid="faction-picker-stub" />,
}));

vi.mock("@/features/unit-database/FactionLinkDialog", () => ({
  FactionLinkDialog: () => <div data-testid="faction-link-dialog-stub" />,
}));

vi.mock("@/features/unit-database/UdbFilterBar", () => ({
  DatabaseBrowserFilters: () => <div data-testid="udb-filter-bar-stub" />,
}));

vi.mock("@/features/unit-database/UdbUnitList", () => ({
  UdbUnitList: () => <div data-testid="udb-unit-list-stub" />,
}));

vi.mock("@/features/unit-database/UdbSearchResults", () => ({
  UdbSearchResults: () => <div data-testid="udb-search-results-stub" />,
}));

vi.mock("@/features/unit-database/UdbDatasheetSheet", () => ({
  UdbDatasheetSheet: () => <div data-testid="udb-datasheet-sheet-stub" />,
}));

vi.mock("@/features/units/UnitSheet", () => ({
  UnitSheet: () => <div data-testid="unit-sheet-stub" />,
}));

import { RulesHubPage } from "@/features/rules-hub/RulesHubPage";
import { DatabaseBrowserPage } from "@/features/unit-database/DatabaseBrowserPage";

function makeWrapper(): ({ children }: { children: ReactNode }) => ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  };
}

describe("NAV-03 — RulesHubPage cross-link to /unit-database", () => {
  it("renders a link with text 'Browse Units' pointing to /unit-database", () => {
    render(<RulesHubPage />, { wrapper: makeWrapper() });
    const link = screen.getByRole("link", { name: /browse units/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/unit-database");
  });
});

describe("NAV-03 — DatabaseBrowserPage cross-link to /rules-hub", () => {
  it("renders a link with text 'View Rules' pointing to /rules-hub", () => {
    render(<DatabaseBrowserPage />, { wrapper: makeWrapper() });
    const link = screen.getByRole("link", { name: /view rules/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/rules-hub");
  });
});
