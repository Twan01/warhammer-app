import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * PROJ-01 — useKanbanEnrichment hook provides recipe names + photo counts as Maps.
 */

const getRecipeNamesByUnitIdsMock = vi.fn();
const getPhotoCountsByUnitIdsMock = vi.fn();

vi.mock("@/db/queries/recipes", () => ({
  getRecipes: vi.fn(),
  getRecipeById: vi.fn(),
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  getRecipeNamesByUnitIds: (ids: number[]) => getRecipeNamesByUnitIdsMock(ids),
}));

vi.mock("@/db/queries/unitPhotos", () => ({
  getPhotosByUnit: vi.fn(),
  createUnitPhoto: vi.fn(),
  deleteUnitPhoto: vi.fn(),
  getLatestPhotoByUnit: vi.fn(),
  getPhotoCountsByUnitIds: (ids: number[]) => getPhotoCountsByUnitIdsMock(ids),
}));

vi.mock("@/db/queries/recipeAssignments", () => ({
  getAssignmentsByUnit: vi.fn().mockResolvedValue([]),
  getStepProgress: vi.fn().mockResolvedValue([]),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  getAssignment: vi.fn(),
  getAssignmentsByRecipe: vi.fn(),
  upsertStepProgress: vi.fn(),
  bulkCreateAssignments: vi.fn(),
}));

vi.mock("@/db/queries/recipePaints", () => ({
  getRecipePaintsByRecipe: vi.fn().mockResolvedValue([]),
  addRecipePaint: vi.fn(),
  updateRecipePaint: vi.fn(),
  removeRecipePaint: vi.fn(),
}));

vi.mock("@/lib/computeAssignmentProgress", () => ({
  computeAssignmentProgress: vi.fn().mockReturnValue({ total: 0, completed: 0, percentage: 0, bySectionId: new Map() }),
}));

import { useKanbanEnrichment, KANBAN_ENRICHMENT_KEY } from "@/hooks/useKanbanEnrichment";

beforeEach(() => {
  getRecipeNamesByUnitIdsMock.mockReset();
  getPhotoCountsByUnitIdsMock.mockReset();
});

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useKanbanEnrichment", () => {
  it("returns recipeNames as Map<number, string>", async () => {
    getRecipeNamesByUnitIdsMock.mockResolvedValueOnce([
      { unit_id: 1, name: "NMM Gold" },
    ]);
    getPhotoCountsByUnitIdsMock.mockResolvedValueOnce([]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useKanbanEnrichment([1]), { wrapper: makeWrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.recipeNames).toBeInstanceOf(Map);
    expect(result.current.data?.recipeNames.get(1)).toBe("NMM Gold");
  });

  it("returns photoCounts as Map<number, number>", async () => {
    getRecipeNamesByUnitIdsMock.mockResolvedValueOnce([]);
    getPhotoCountsByUnitIdsMock.mockResolvedValueOnce([
      { entity_id: 2, photo_count: 3 },
    ]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useKanbanEnrichment([2]), { wrapper: makeWrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.photoCounts).toBeInstanceOf(Map);
    expect(result.current.data?.photoCounts.get(2)).toBe(3);
  });

  it("query key uses sorted unitIds — Pitfall 2", () => {
    // Passing [3, 1, 2] → sorted key should be ["kanban-enrichment", 1, 2, 3]
    const key = KANBAN_ENRICHMENT_KEY([1, 2, 3]);
    expect(key).toEqual(["kanban-enrichment", 1, 2, 3]);

    // Hook internally sorts before passing to KANBAN_ENRICHMENT_KEY
    getRecipeNamesByUnitIdsMock.mockResolvedValue([]);
    getPhotoCountsByUnitIdsMock.mockResolvedValue([]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useKanbanEnrichment([3, 1, 2]), { wrapper: makeWrapper(qc) });

    // Cache should use sorted key
    const cached = qc.getQueryCache().find({ queryKey: ["kanban-enrichment", 1, 2, 3] });
    expect(cached).toBeDefined();
  });

  it("enabled is false when unitIds is empty", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useKanbanEnrichment([]), { wrapper: makeWrapper(qc) });

    // With enabled: false, query never fires — status is 'pending' but fetchStatus is 'idle'
    expect(result.current.fetchStatus).toBe("idle");
    expect(getRecipeNamesByUnitIdsMock).not.toHaveBeenCalled();
    expect(getPhotoCountsByUnitIdsMock).not.toHaveBeenCalled();
  });
});
