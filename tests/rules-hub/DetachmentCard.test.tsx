/**
 * Phase 53 Plan 03 — DetachmentCard tests.
 *
 * RULES-06: renders detachment name and abilities count badge
 * RULES-06: when expanded, renders ability names
 * RULES-06: handles empty abilities array gracefully
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { RwDetachment, RwDetachmentAbility } from "@/types/datasheet";
import type { UseQueryResult } from "@tanstack/react-query";
import { useDetachmentAbilitiesByDetachment } from "@/hooks/useRulesExtended";

vi.mock("@/hooks/useRulesExtended", () => ({
  useDetachmentAbilitiesByDetachment: vi.fn(),
}));

const mockUseDetachmentAbilitiesByDetachment = vi.mocked(useDetachmentAbilitiesByDetachment);

function makeQueryResult<T>(data: T, isLoading = false): UseQueryResult<T> {
  return {
    data,
    isLoading,
    isError: false,
    error: null,
    status: isLoading ? "pending" : "success",
    isPending: isLoading,
    isSuccess: !isLoading,
    isFetching: false,
    isRefetching: false,
    isStale: false,
    isPlaceholderData: false,
    isFetchedAfterMount: true,
    isFetched: true,
    isLoadingError: false,
    isRefetchError: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    fetchStatus: "idle",
    refetch: vi.fn(),
    promise: Promise.resolve(data),
  } as unknown as UseQueryResult<T>;
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockDetachment: RwDetachment = {
  id: "det-1",
  faction_id: "SM",
  name: "Gladius Task Force",
  legend: null,
  type: null,
};

const mockAbilities: RwDetachmentAbility[] = [
  {
    id: "a1",
    faction_id: "SM",
    name: "Combat Doctrines",
    legend: "Tactical flexibility",
    description: "Some ability text about tactics",
    detachment: "Gladius Task Force",
    detachment_id: "det-1",
  },
  {
    id: "a2",
    faction_id: "SM",
    name: "Rapid Assault",
    legend: null,
    description: "Advance and shoot without penalty",
    detachment: "Gladius Task Force",
    detachment_id: "det-1",
  },
  {
    id: "a3",
    faction_id: "SM",
    name: "Iron Will",
    legend: "Stubborn defenders",
    description: null,
    detachment: "Gladius Task Force",
    detachment_id: "det-1",
  },
];

// Import component AFTER mocks are set up
import { DetachmentCard } from "@/features/rules-hub/DetachmentCard";

describe("DetachmentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders detachment name and abilities count badge", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult(mockAbilities)
    );

    render(<DetachmentCard detachment={mockDetachment} />, { wrapper });

    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
    expect(screen.getByText("3 abilities")).toBeInTheDocument();
  });

  it("shows singular 'ability' when count is 1", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([mockAbilities[0]])
    );

    render(<DetachmentCard detachment={mockDetachment} />, { wrapper });

    expect(screen.getByText("1 ability")).toBeInTheDocument();
  });

  it("shows '0 abilities' badge when no abilities", () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([])
    );

    render(<DetachmentCard detachment={mockDetachment} />, { wrapper });

    expect(screen.getByText("0 abilities")).toBeInTheDocument();
  });

  it("shows ability names after expanding the card", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult(mockAbilities)
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} />, { wrapper });

    // Abilities not visible initially
    expect(screen.queryByText("Combat Doctrines")).not.toBeInTheDocument();

    // Click the trigger to expand
    await user.click(screen.getByText("Gladius Task Force"));

    expect(screen.getByText("Combat Doctrines")).toBeInTheDocument();
    expect(screen.getByText("Rapid Assault")).toBeInTheDocument();
    expect(screen.getByText("Iron Will")).toBeInTheDocument();
  });

  it("shows 'No abilities found' when expanded with empty list", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([])
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    expect(screen.getByText("No abilities found.")).toBeInTheDocument();
  });

  it("shows 'Loading...' when isLoading is true", async () => {
    mockUseDetachmentAbilitiesByDetachment.mockReturnValue(
      makeQueryResult([], true)
    );

    const user = userEvent.setup();
    render(<DetachmentCard detachment={mockDetachment} />, { wrapper });

    await user.click(screen.getByText("Gladius Task Force"));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
