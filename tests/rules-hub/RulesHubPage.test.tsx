/**
 * Phase 53 / 107 -- RulesHubPage tests.
 *
 * Phase 107: sync infrastructure removed (no "Sync now" button, no diff summary).
 * RULES-09: disclaimer text "community-sourced from Wahapedia" present in render.
 * Sync-related tests (RULES-02, RULES-04) are marked as todo since sync was removed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({
    data: [
      { id: 1, name: "Space Marines", color_theme: "#000", icon_path: null, game_system: "40k", description: null, created_at: "", updated_at: "" },
    ],
  })),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useWahapediaFactionId: vi.fn(() => ({ data: "SM" })),
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

import { RulesHubPage } from "@/features/rules-hub/RulesHubPage";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  };
}

describe("RulesHubPage -- RULES-09: Wahapedia disclaimer", () => {
  it("renders the disclaimer text", () => {
    render(<RulesHubPage />, { wrapper: makeWrapper() });
    expect(
      screen.getByText(/community-sourced from Wahapedia/i),
    ).toBeDefined();
  });
});

// Phase 107: sync infrastructure removed -- these tests are deferred
describe("RulesHubPage -- sync features (removed in Phase 107)", () => {
  it.todo("RULES-02: sync button fires mutation (sync removed)");
  it.todo("RULES-04: diff summary after sync (sync removed)");
});
