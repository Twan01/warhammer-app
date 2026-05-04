/**
 * Phase 15 — DatasheetPicker component tests.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const useDatasheetsByFactionMock = vi.fn();

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheetsByFaction: (factionId?: string) => useDatasheetsByFactionMock(factionId),
}));

import { DatasheetPicker } from "@/features/units/DatasheetPicker";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useDatasheetsByFactionMock.mockReset();
});

describe("DatasheetPicker", () => {
  it("DS-04: renders Dialog with the unit's faction name in DialogDescription and one button per pre-filtered datasheet row", () => {
    useDatasheetsByFactionMock.mockReturnValue({
      data: [
        { id: "001", name: "Intercessors", role: "Battleline" },
        { id: "002", name: "Hellblasters", role: "Battleline" },
      ],
      isLoading: false,
    });
    render(
      <DatasheetPicker
        open={true}
        factionId="SM"
        factionName="Space Marines"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText(/Searching Space Marines datasheets/)).toBeInTheDocument();
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Hellblasters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(useDatasheetsByFactionMock).toHaveBeenCalledWith("SM");
  });

  it("DS-04: search input filters list by case-insensitive substring match on name; empty match shows 'No datasheets found.' empty state", () => {
    useDatasheetsByFactionMock.mockReturnValue({
      data: [
        { id: "001", name: "Intercessors", role: "Battleline" },
        { id: "002", name: "Terminators", role: "Elite" },
        { id: "003", name: "Hellblasters", role: "Battleline" },
      ],
      isLoading: false,
    });
    render(
      <DatasheetPicker
        open={true}
        factionId="SM"
        factionName="Space Marines"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );
    const searchInput = screen.getByLabelText("Search datasheets");

    // Filter to only Terminators
    fireEvent.change(searchInput, { target: { value: "term" } });
    expect(screen.queryByText("Intercessors")).toBeNull();
    expect(screen.getByText("Terminators")).toBeInTheDocument();

    // Clear → all 3 visible again
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Terminators")).toBeInTheDocument();
    expect(screen.getByText("Hellblasters")).toBeInTheDocument();

    // No match → empty state copy
    fireEvent.change(searchInput, { target: { value: "zzz" } });
    expect(screen.getByText("No datasheets found. Try a different search term.")).toBeInTheDocument();
  });
});
