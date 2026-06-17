/**
 * Phase 134 HON-04 — DatasheetPicker browse-all path tests.
 *
 * Requirements tested:
 *   - When factionId is undefined and search is empty/short, prompt is shown
 *   - useUdbSearch is engaged when factionId is undefined
 *   - Scoped path (factionId defined) unchanged — uses useDatasheetsByFaction
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { DatasheetPicker } from "@/features/units/DatasheetPicker";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useDatasheet", () => ({
  useDatasheetsByFaction: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbSearch: vi.fn(() => ({ data: [] })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const baseProps = {
  open: true,
  factionName: "All",
  onSelect: vi.fn(),
  onClose: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DatasheetPicker — browse-all mode (factionId undefined)", () => {
  it("shows the 2-char prompt when factionId is undefined and search is empty", () => {
    render(
      <DatasheetPicker {...baseProps} factionId={undefined} />,
      { wrapper },
    );
    expect(
      screen.getByText("Type at least 2 characters to search all datasheets."),
    ).toBeInTheDocument();
  });

  it("shows prompt text when factionId is undefined and search is only 1 char", async () => {
    const user = userEvent.setup();
    render(
      <DatasheetPicker {...baseProps} factionId={undefined} />,
      { wrapper },
    );

    const input = screen.getByRole("textbox", { name: /search datasheets/i });
    await user.type(input, "S");

    expect(
      screen.getByText("Type at least 2 characters to search all datasheets."),
    ).toBeInTheDocument();
  });

  it("calls useUdbSearch when factionId is undefined", async () => {
    const { useUdbSearch } = await import("@/hooks/useUnitDatabase");
    render(
      <DatasheetPicker {...baseProps} factionId={undefined} />,
      { wrapper },
    );
    // useUdbSearch should have been called (with empty string initially — disabled at <2 chars)
    expect(vi.mocked(useUdbSearch)).toHaveBeenCalled();
  });

  it("shows 'Search all datasheets' description in browse-all mode", () => {
    render(
      <DatasheetPicker {...baseProps} factionId={undefined} />,
      { wrapper },
    );
    expect(screen.getByText("Search all datasheets")).toBeInTheDocument();
  });
});

describe("DatasheetPicker — scoped mode (factionId defined)", () => {
  it("uses useDatasheetsByFaction when factionId is provided", async () => {
    const { useDatasheetsByFaction } = await import("@/hooks/useDatasheet");
    render(
      <DatasheetPicker {...baseProps} factionId="SM" factionName="Space Marines" />,
      { wrapper },
    );
    expect(vi.mocked(useDatasheetsByFaction)).toHaveBeenCalledWith("SM");
  });

  it("shows scoped description when factionId is defined", () => {
    render(
      <DatasheetPicker {...baseProps} factionId="SM" factionName="Space Marines" />,
      { wrapper },
    );
    expect(screen.getByText("Searching Space Marines datasheets")).toBeInTheDocument();
  });

  it("does not show browse-all prompt in scoped mode", () => {
    render(
      <DatasheetPicker {...baseProps} factionId="SM" factionName="Space Marines" />,
      { wrapper },
    );
    expect(
      screen.queryByText("Type at least 2 characters to search all datasheets."),
    ).not.toBeInTheDocument();
  });
});
