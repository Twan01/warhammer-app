// @vitest-environment jsdom

/**
 * Nyquist test: TechniqueLibraryTab component (LIB-01, LIB-03).
 *
 * - LIB-01: Techniques tab appears on the /recipes page
 * - LIB-03: Name filter + effect filter narrow the cards
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TechniqueLibraryTab } from "@/features/techniques/TechniqueLibraryTab";
import type { TechniqueWithCounts } from "@/types/technique";

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useTechniques", () => ({
  useTechniquesWithCounts: vi.fn(),
  useDuplicateTechnique: vi.fn(),
  useDeleteTechnique: vi.fn(),
  useTechniqueUsedByRecipes: vi.fn(),
  useCreateTechnique: vi.fn(),
  useUpdateTechnique: vi.fn(),
}));

vi.mock("@/hooks/useTechniqueSections", () => ({
  useTechniqueSections: vi.fn(),
  useTechniqueSteps: vi.fn(),
}));

vi.mock("@/hooks/useTechniqueColourSlots", () => ({
  useTechniqueColourSlots: vi.fn(),
}));

import {
  useTechniquesWithCounts,
  useDuplicateTechnique,
  useDeleteTechnique,
  useTechniqueUsedByRecipes,
  useCreateTechnique,
  useUpdateTechnique,
} from "@/hooks/useTechniques";
import { useTechniqueSections, useTechniqueSteps } from "@/hooks/useTechniqueSections";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------

const makeTechnique = (
  partial: Partial<TechniqueWithCounts> & { id: number; name: string },
): TechniqueWithCounts => ({
  id: partial.id,
  name: partial.name,
  effect: partial.effect ?? null,
  difficulty: partial.difficulty ?? null,
  notes: null,
  created_at: "2026-06-21T00:00:00Z",
  updated_at: "2026-06-21T00:00:00Z",
  slot_count: partial.slot_count ?? 0,
  step_count: partial.step_count ?? 0,
  usage_count: partial.usage_count ?? 0,
});

const STUB_TECHNIQUES: TechniqueWithCounts[] = [
  makeTechnique({ id: 1, name: "OSL Glow", effect: "OSL" }),
  makeTechnique({ id: 2, name: "NMM Gold", effect: "NMM" }),
  makeTechnique({ id: 3, name: "Wet Blend Skin", effect: "Wet Blend" }),
];

const mockMutateAsync = vi.fn();

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.mocked(useTechniquesWithCounts).mockReturnValue({
    data: STUB_TECHNIQUES,
    isLoading: false,
    isError: false,
  } as never);
  vi.mocked(useDuplicateTechnique).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);
  vi.mocked(useDeleteTechnique).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);
  vi.mocked(useTechniqueUsedByRecipes).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useTechniqueSections).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useTechniqueSteps).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useTechniqueColourSlots).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useCreateTechnique).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);
  vi.mocked(useUpdateTechnique).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TechniqueLibraryTab (LIB-01, LIB-03)", () => {
  it("renders all technique cards when no filter is active", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    expect(screen.getByText("OSL Glow")).toBeInTheDocument();
    expect(screen.getByText("NMM Gold")).toBeInTheDocument();
    expect(screen.getByText("Wet Blend Skin")).toBeInTheDocument();
  });

  it("renders 'Add Technique' button", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    expect(screen.getByRole("button", { name: /Add Technique/i })).toBeInTheDocument();
  });

  it("renders Search techniques input", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    expect(screen.getByPlaceholderText("Search techniques…")).toBeInTheDocument();
  });

  it("name filter narrows the visible cards (LIB-03)", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    const input = screen.getByPlaceholderText("Search techniques…");
    fireEvent.change(input, { target: { value: "osl" } });
    // OSL Glow matches; NMM Gold and Wet Blend Skin do not
    expect(screen.getByText("OSL Glow")).toBeInTheDocument();
    expect(screen.queryByText("NMM Gold")).toBeNull();
    expect(screen.queryByText("Wet Blend Skin")).toBeNull();
  });

  it("name filter is case-insensitive (LIB-03)", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    const input = screen.getByPlaceholderText("Search techniques…");
    fireEvent.change(input, { target: { value: "WET" } });
    expect(screen.getByText("Wet Blend Skin")).toBeInTheDocument();
    expect(screen.queryByText("OSL Glow")).toBeNull();
  });

  it("shows 'Clear filters' when name filter is active", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    const input = screen.getByPlaceholderText("Search techniques…");
    fireEvent.change(input, { target: { value: "osl" } });
    expect(screen.getByRole("button", { name: /Clear filters/i })).toBeInTheDocument();
  });

  it("clears filter and shows all cards on 'Clear filters' click", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    const input = screen.getByPlaceholderText("Search techniques…");
    fireEvent.change(input, { target: { value: "osl" } });
    expect(screen.queryByText("NMM Gold")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Clear filters/i }));
    expect(screen.getByText("NMM Gold")).toBeInTheDocument();
    expect(screen.getByText("Wet Blend Skin")).toBeInTheDocument();
  });

  it("shows 'No techniques match your filters.' when filtered to empty", () => {
    render(<TechniqueLibraryTab />, { wrapper });
    const input = screen.getByPlaceholderText("Search techniques…");
    fireEvent.change(input, { target: { value: "nonexistentxyz" } });
    expect(screen.getByText("No techniques match your filters.")).toBeInTheDocument();
  });
});
