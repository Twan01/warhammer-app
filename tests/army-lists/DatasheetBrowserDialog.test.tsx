/**
 * Phase 93 — DatasheetBrowserDialog tests (BRW-01, BRW-02).
 *
 * Covers grouped rendering, ghost unit add via ds.name, empty state when
 * no Wahapedia mapping, and multi-add (dialog stays open).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DatasheetBrowserDialog } from "@/features/army-lists/DatasheetBrowserDialog";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutate = vi.fn();

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({
    data: [{ id: 1, name: "Space Marines", created_at: "2025-01-01" }],
  }),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  useWahapediaFactionId: (name: string | undefined) => ({
    data: name === "Space Marines" ? "SM" : undefined,
  }),
  useDatasheetsByFactionWithPoints: (factionId: string | undefined) => ({
    data: factionId === "SM"
      ? [
          { id: "ds-1", name: "Intercessors", role: "Battleline", points: 80 },
          { id: "ds-2", name: "Captain", role: "Character", points: 80 },
          { id: "ds-3", name: "Eradicators", role: "Battleline", points: 95 },
        ]
      : [],
  }),
}));

vi.mock("@/hooks/useArmyLists", () => ({
  useAddGhostUnitToList: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(props: Partial<Parameters<typeof DatasheetBrowserDialog>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DatasheetBrowserDialog
        open={true}
        listId={1}
        factionId={1}
        onClose={() => {}}
        {...props}
      />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DatasheetBrowserDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders datasheets grouped by role", () => {
    renderDialog();

    // Role group headings (use getAllByText since role also appears as Badge text)
    const characterElements = screen.getAllByText("Character");
    expect(characterElements.length).toBeGreaterThanOrEqual(1);
    const battlelineElements = screen.getAllByText("Battleline");
    expect(battlelineElements.length).toBeGreaterThanOrEqual(1);

    // Datasheet names
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Captain")).toBeInTheDocument();
    expect(screen.getByText("Eradicators")).toBeInTheDocument();

    // Points display (80pts appears twice: Intercessors + Captain)
    const pts80 = screen.getAllByText("80pts");
    expect(pts80.length).toBe(2);
    expect(screen.getByText("95pts")).toBeInTheDocument();
  });

  it("calls addGhostUnit.mutate with ds.name on selection", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Click the Intercessors item
    const intercessors = screen.getByText("Intercessors");
    await user.click(intercessors);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { list_id: 1, ghost_unit_name: "Intercessors" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("shows empty state when wahapediaFactionId is null", () => {
    // factionId=999 will not match any faction in useFactions mock,
    // so useWahapediaFactionId receives undefined and returns undefined
    renderDialog({ factionId: 999 });

    expect(
      screen.getByText("Set a faction on this list to browse datasheets."),
    ).toBeInTheDocument();
  });

  it("dialog stays open after selection (no onClose called)", async () => {
    const closeSpy = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onClose: closeSpy });

    const captain = screen.getByText("Captain");
    await user.click(captain);

    // onClose should NOT have been called — dialog stays open for multi-add
    expect(closeSpy).not.toHaveBeenCalled();
    // Dialog title should still be visible
    expect(screen.getByText("Browse Datasheets")).toBeInTheDocument();
  });
});
