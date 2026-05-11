/**
 * ARMY-02 / ARMY-03 — DetachmentRulesSection tests.
 * Covers: inline ability display, StratagemCard rendering, empty states, loading skeletons.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DetachmentRulesSection } from "@/features/army-lists/DetachmentRulesSection";
import {
  useDetachmentAbilitiesByDetachment,
  useStratagemsByDetachment,
} from "@/hooks/useRulesExtended";
import type { RwDetachmentAbility, RwStratagem } from "@/types/datasheet";

vi.mock("@/hooks/useRulesExtended", () => ({
  useDetachmentAbilitiesByDetachment: vi.fn(),
  useStratagemsByDetachment: vi.fn(),
}));

vi.mock("@/features/rules-hub/StratagemCard", () => ({
  StratagemCard: ({ stratagem }: { stratagem: RwStratagem }) => (
    <div data-testid="stratagem-card">{stratagem.name}</div>
  ),
}));

const mockUseAbilities = vi.mocked(useDetachmentAbilitiesByDetachment);
const mockUseStratagems = vi.mocked(useStratagemsByDetachment);

function makeAbility(over: Partial<RwDetachmentAbility> = {}): RwDetachmentAbility {
  return {
    id: "ABIL001",
    faction_id: "SM",
    name: "Adeptus Astartes",
    legend: null,
    description: "Space Marines are tough.",
    detachment: "Gladius",
    detachment_id: "DET001",
    ...over,
  };
}

function makeStratagem(over: Partial<RwStratagem> = {}): RwStratagem {
  return {
    id: "STRAT001",
    faction_id: "SM",
    name: "Honour the Chapter",
    type: null,
    cp_cost: "1",
    legend: null,
    turn: null,
    phase: "Command",
    detachment: "Gladius",
    detachment_id: "DET001",
    description: "Use this once per game.",
    ...over,
  };
}

function renderSection(detachmentId: string | null | undefined) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DetachmentRulesSection detachmentId={detachmentId} />
    </QueryClientProvider>,
  );
}

describe("DetachmentRulesSection", () => {
  it("renders empty state when detachmentId is null", () => {
    mockUseAbilities.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilitiesByDetachment>);
    mockUseStratagems.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    renderSection(null);
    expect(screen.getByText("Select a detachment to see its rules")).toBeInTheDocument();
  });

  it("renders detachment ability inline (name + description) when abilities present", () => {
    mockUseAbilities.mockReturnValue({
      data: [makeAbility()],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilitiesByDetachment>);
    mockUseStratagems.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    renderSection("DET001");
    expect(screen.getByText("Detachment Ability")).toBeInTheDocument();
    expect(screen.getByText("Adeptus Astartes")).toBeInTheDocument();
    expect(screen.getByText("Space Marines are tough.")).toBeInTheDocument();
  });

  it("renders StratagemCard for each stratagem when data present", () => {
    mockUseAbilities.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilitiesByDetachment>);
    mockUseStratagems.mockReturnValue({
      data: [makeStratagem(), makeStratagem({ id: "STRAT002", name: "Bolter Discipline" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    renderSection("DET001");
    expect(screen.getByText(/Stratagems/)).toBeInTheDocument();
    const cards = screen.getAllByTestId("stratagem-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Honour the Chapter")).toBeInTheDocument();
    expect(screen.getByText("Bolter Discipline")).toBeInTheDocument();
  });

  it("renders 'No rules data available' when detachmentId set but no abilities and no stratagems", () => {
    mockUseAbilities.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentAbilitiesByDetachment>);
    mockUseStratagems.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    renderSection("DET001");
    expect(screen.getByText(/No rules data available/)).toBeInTheDocument();
  });

  it("renders loading skeletons while isLoading=true", () => {
    mockUseAbilities.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useDetachmentAbilitiesByDetachment>);
    mockUseStratagems.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useStratagemsByDetachment>);

    const { container } = renderSection("DET001");
    // Skeleton elements render as divs with animate-pulse
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});
