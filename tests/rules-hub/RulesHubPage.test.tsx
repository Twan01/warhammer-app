/**
 * Phase 53 Plan 01 — RulesHubPage tests.
 *
 * RULES-02: sync button calls rulesSync.mutate
 * RULES-04: after mock sync success, diff summary shows counts
 * RULES-09: disclaimer text "community-sourced from Wahapedia" present in render
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

const mockMutate = vi.fn();

vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({
    data: [
      { id: 1, name: "Space Marines", color_theme: "#000", icon_path: null, game_system: "40k", description: null, created_at: "", updated_at: "" },
    ],
  })),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useRulesSyncMeta: vi.fn(() => ({
    data: {
      id: 1,
      last_sync_at: "2026-05-09T10:00:00Z",
      wahapedia_version: "20260509",
      factions_count: 30,
      sources_count: 5,
      datasheets_count: 1200,
      models_count: 800,
      abilities_count: 500,
      keywords_count: 600,
      wargear_count: 400,
      shared_abilities_count: 100,
      stratagems_count: 300,
      detachments_count: 50,
      detachment_abilities_count: 200,
    },
  })),
  useWahapediaFactionId: vi.fn(() => ({ data: "SM" })),
  RULES_SYNC_META_KEY: ["rules-sync-meta"],
}));

vi.mock("@/hooks/useRulesSync", () => ({
  useRulesSync: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

vi.mock("@/hooks/useSyncErrors", () => ({
  useRulesSyncErrors: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/hooks/useRulesExtended", () => ({
  useStratagemsByFaction: vi.fn(() => ({ data: [] })),
  useDetachmentsByFaction: vi.fn(() => ({ data: [] })),
  useSharedAbilitiesByFaction: vi.fn(() => ({ data: [] })),
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

beforeEach(() => {
  mockMutate.mockReset();
});

describe("RulesHubPage — RULES-02: sync button fires mutation", () => {
  it("calls rulesSync.mutate when Sync now button is clicked", async () => {
    const user = userEvent.setup();
    render(<RulesHubPage />, { wrapper: makeWrapper() });

    const syncBtn = screen.getByRole("button", { name: /sync now/i });
    await user.click(syncBtn);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});

describe("RulesHubPage — RULES-04: diff summary after sync", () => {
  it("shows diff summary after onSyncComplete is called", async () => {
    const user = userEvent.setup();

    // Make mutate call onSyncComplete via the first argument's onSuccess
    mockMutate.mockImplementation((_input: undefined, options: { onSuccess?: (data: unknown) => void }) => {
      options?.onSuccess?.({
        wahapediaVersion: "20260510",
        rowCounts: {},
        diff: { added: [{ id: "a", name: "A" }], removed: [], modified: [], renamed: [], total_changed: 1 },
      });
    });

    render(<RulesHubPage />, { wrapper: makeWrapper() });

    const syncBtn = screen.getByRole("button", { name: /sync now/i });
    await user.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByText(/\+1 added/)).toBeDefined();
    });
  });
});

describe("RulesHubPage — RULES-09: Wahapedia disclaimer", () => {
  it("renders the disclaimer text", () => {
    render(<RulesHubPage />, { wrapper: makeWrapper() });
    expect(
      screen.getByText(/community-sourced from Wahapedia/i),
    ).toBeDefined();
  });
});
