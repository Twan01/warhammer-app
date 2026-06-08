/**
 * Phase 53/107/120 -- DetachmentCard tests.
 * Phase 107: detachment abilities data source (rules.db) eliminated -- stub returns empty.
 * Phase 120: migrated to UdbDetachment type; mock useDetachmentAbilitiesByDetachment from useGameData.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { UdbDetachment } from "@/types/gameData";

vi.mock("@/hooks/useRulesFavorites", () => ({
  useUpsertRulesFavorite: () => ({ mutate: vi.fn() }),
  useDeleteRulesFavorite: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useRulesNotes", () => ({
  useUpsertRulesNote: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useGameData", () => ({
  useDetachmentAbilitiesByDetachment: () => ({ data: [], isLoading: false }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockDetachment: UdbDetachment = {
  id: "det-1",
  faction_id: "SM",
  name: "Gladius Task Force",
};

import { DetachmentCard } from "@/features/rules-hub/DetachmentCard";

describe("DetachmentCard", () => {
  it("renders detachment name", () => {
    render(
      <DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />,
      { wrapper },
    );
    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
  });

  it("shows '0 abilities' badge when no abilities loaded", () => {
    render(
      <DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />,
      { wrapper },
    );
    expect(screen.getByText("0 abilities")).toBeInTheDocument();
  });

  it("shows 'No abilities found.' when expanded with empty list", async () => {
    const user = userEvent.setup();
    render(
      <DetachmentCard detachment={mockDetachment} favoritesMap={new Map()} notesMap={new Map()} />,
      { wrapper },
    );
    await user.click(screen.getByText("Gladius Task Force"));
    expect(screen.getByText("No abilities found.")).toBeInTheDocument();
  });
});
