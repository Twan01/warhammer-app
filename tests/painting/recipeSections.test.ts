/**
 * SECT-04/05/06 — recipeSections query module and hook contract coverage.
 *
 * Tests SQL assertions for all 6 query functions, the updated addRecipePaint
 * INSERT (section_id as $13), and type shape checks for RecipeSection and RecipeStep.
 * Groups 10–14 cover hook invalidation contracts via renderHook + invalidateQueries spy.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import {
  getRecipeSections,
  createRecipeSection,
  updateRecipeSection,
  deleteRecipeSection,
  reorderRecipeSections,
  getStepCountsBySection,
} from "@/db/queries/recipeSections";
import { addRecipePaint, getRecipePaintsByRecipe } from "@/db/queries/recipePaints";
import type { CreateRecipeSectionInput, UpdateRecipeSectionInput, RecipeSection } from "@/types/recipeSection";
import type { RecipeStep, CreateRecipeStepInput } from "@/types/recipePaint";

// Hook imports — used by groups 10-14
import {
  RECIPE_SECTIONS_KEY,
  useCreateRecipeSection,
  useUpdateRecipeSection,
  useDeleteRecipeSection,
  useReorderRecipeSections,
  useSectionStepCounts,
} from "@/hooks/useRecipeSections";
import {
  RECIPE_PAINTS_KEY,
  STEP_COUNTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
} from "@/hooks/useRecipePaints";

// Alias selectMock accessor for clarity in hook tests that configure it per-test
const getSelectMock = () => selectMock;

function makeStepInput(over: Partial<CreateRecipeStepInput> = {}): CreateRecipeStepInput {
  return {
    recipe_id: 1,
    paint_id: 2,
    step_name: "Basecoat",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: null,
    ...over,
  };
}

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Group 1 — getRecipeSections (SECT-04 read)
// ---------------------------------------------------------------------------
describe("getRecipeSections — SECT-04 read", () => {
  it("queries recipe_sections filtered by recipe_id with correct order", async () => {
    await getRecipeSections(42);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM recipe_sections WHERE recipe_id = $1");
    expect(sql).toContain("ORDER BY order_index ASC, id ASC");
    expect(params).toEqual([42]);
  });

  it("passes the caller's recipeId as the $1 param", async () => {
    await getRecipeSections(7);
    const [, params] = selectMock.mock.calls[0];
    expect(params[0]).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Group 2 — createRecipeSection (SECT-04 create)
// ---------------------------------------------------------------------------
describe("createRecipeSection — SECT-04 create", () => {
  const input: CreateRecipeSectionInput = {
    recipe_id: 1,
    name: "Armour",
    surface: "Metal",
    optional: 0,
    order_index: 0,
    notes: "First pass",
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
  };

  it("INSERT contains all 10 column names and $1 through $10 placeholders", async () => {
    await createRecipeSection(input);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("recipe_id");
    expect(sql).toContain("name");
    expect(sql).toContain("surface");
    expect(sql).toContain("optional");
    expect(sql).toContain("order_index");
    expect(sql).toContain("notes");
    expect(sql).toContain("section_type");
    expect(sql).toContain("technique");
    expect(sql).toContain("execution_mode");
    expect(sql).toContain("applies_to");
    expect(sql).toContain("$1");
    expect(sql).toContain("$2");
    expect(sql).toContain("$3");
    expect(sql).toContain("$4");
    expect(sql).toContain("$5");
    expect(sql).toContain("$6");
    expect(sql).toContain("$7");
    expect(sql).toContain("$8");
    expect(sql).toContain("$9");
    expect(sql).toContain("$10");
  });

  it("passes params in the correct positional order (10 params)", async () => {
    await createRecipeSection(input);
    const [, params] = executeMock.mock.calls[0];
    expect(params[0]).toBe(1);          // $1 recipe_id
    expect(params[1]).toBe("Armour");   // $2 name
    expect(params[2]).toBe("Metal");    // $3 surface
    expect(params[3]).toBe(0);          // $4 optional
    expect(params[4]).toBe(0);          // $5 order_index
    expect(params[5]).toBe("First pass"); // $6 notes
    expect(params[6]).toBeNull();       // $7 section_type
    expect(params[7]).toBeNull();       // $8 technique
    expect(params[8]).toBeNull();       // $9 execution_mode
    expect(params[9]).toBeNull();       // $10 applies_to
    expect(params).toHaveLength(10);
  });

  it("applies null guards — surface and notes become null when not provided", async () => {
    await createRecipeSection({ ...input, surface: null, notes: null });
    const [, params] = executeMock.mock.calls[0];
    expect(params[2]).toBeNull(); // $3 surface
    expect(params[5]).toBeNull(); // $6 notes
  });

  it("passes non-null workflow metadata as $7-$10 when provided", async () => {
    const inputWithMeta: CreateRecipeSectionInput = {
      ...input,
      section_type: "basecoat",
      technique: "airbrush",
      execution_mode: "sequential",
      applies_to: "armor panels",
    };
    await createRecipeSection(inputWithMeta);
    const [, params] = executeMock.mock.calls[0];
    expect(params[6]).toBe("basecoat");     // $7 section_type
    expect(params[7]).toBe("airbrush");     // $8 technique
    expect(params[8]).toBe("sequential");   // $9 execution_mode
    expect(params[9]).toBe("armor panels"); // $10 applies_to
    expect(params).toHaveLength(10);
  });

  it("returns lastInsertId from db.execute result", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 55 });
    const id = await createRecipeSection(input);
    expect(id).toBe(55);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — updateRecipeSection (SECT-04 update)
// ---------------------------------------------------------------------------
describe("updateRecipeSection — SECT-04 update", () => {
  it("UPDATE uses COALESCE for name, optional, order_index and WHERE id = $1", async () => {
    const input: UpdateRecipeSectionInput = { id: 5, name: "Cloth" };
    await updateRecipeSection(input);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("COALESCE($2, name)");
    expect(sql).toContain("COALESCE($4, optional)");
    expect(sql).toContain("COALESCE($5, order_index)");
    expect(sql).toContain("WHERE id = $1");
    expect(sql).toContain("updated_at = datetime('now')");
    expect(params[0]).toBe(5);
  });

  it("workflow metadata fields use direct assignment (not COALESCE) to allow clearing", async () => {
    const input: UpdateRecipeSectionInput = {
      id: 5,
      section_type: null,
      technique: null,
      execution_mode: null,
      applies_to: null,
    };
    await updateRecipeSection(input);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).not.toContain("COALESCE($7");
    expect(sql).not.toContain("COALESCE($8");
    expect(sql).not.toContain("COALESCE($9");
    expect(sql).not.toContain("COALESCE($10");
    expect(sql).toContain("section_type = $7");
    expect(sql).toContain("technique = $8");
    expect(sql).toContain("execution_mode = $9");
    expect(sql).toContain("applies_to = $10");
    expect(params).toHaveLength(10);
  });

  it("surface and notes use direct assignment (not COALESCE) to allow clearing", async () => {
    const input: UpdateRecipeSectionInput = { id: 3, surface: null, notes: null };
    await updateRecipeSection(input);
    const [sql] = executeMock.mock.calls[0];
    // surface and notes should NOT appear inside COALESCE
    expect(sql).not.toContain("COALESCE($3");
    expect(sql).not.toContain("COALESCE($6");
    // but they must appear as direct assignments
    expect(sql).toContain("surface = $3");
    expect(sql).toContain("notes = $6");
  });
});

// ---------------------------------------------------------------------------
// Group 4 — deleteRecipeSection (SECT-04 delete)
// ---------------------------------------------------------------------------
describe("deleteRecipeSection — SECT-04 delete", () => {
  it("executes DELETE FROM recipe_sections WHERE id = $1 with correct id", async () => {
    await deleteRecipeSection(7);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("DELETE FROM recipe_sections WHERE id = $1");
    expect(params).toEqual([7]);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — reorderRecipeSections (SECT-05)
// ---------------------------------------------------------------------------
describe("reorderRecipeSections — SECT-05", () => {
  it("calls db.execute once per section with correct order_index ($1) and id ($2)", async () => {
    const sections = [
      { id: 3, order_index: 0 },
      { id: 1, order_index: 1 },
      { id: 2, order_index: 2 },
    ];
    await reorderRecipeSections(sections);
    expect(executeMock).toHaveBeenCalledTimes(3);

    const [sql0, params0] = executeMock.mock.calls[0];
    expect(sql0).toContain("UPDATE recipe_sections SET order_index = $1");
    expect(params0).toEqual([0, 3]);

    const [, params1] = executeMock.mock.calls[1];
    expect(params1).toEqual([1, 1]);

    const [, params2] = executeMock.mock.calls[2];
    expect(params2).toEqual([2, 2]);
  });

  it("includes updated_at = datetime('now') in each UPDATE", async () => {
    await reorderRecipeSections([{ id: 1, order_index: 0 }]);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("updated_at = datetime('now')");
  });
});

// ---------------------------------------------------------------------------
// Group 6 — getStepCountsBySection (SECT-06)
// ---------------------------------------------------------------------------
describe("getStepCountsBySection — SECT-06", () => {
  it("queries COUNT(*) AS step_count GROUP BY section_id WHERE section_id IS NOT NULL", async () => {
    await getStepCountsBySection();
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("COUNT(*) AS step_count");
    expect(sql).toContain("WHERE section_id IS NOT NULL");
    expect(sql).toContain("GROUP BY section_id");
    expect(params).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Group 7 — addRecipePaint section_id support (SECT-02)
// ---------------------------------------------------------------------------
describe("addRecipePaint — section_id support (SECT-02)", () => {
  it("INSERT contains section_id column and $13 placeholder", async () => {
    await addRecipePaint(makeStepInput({ section_id: 99 }));
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("section_id");
    expect(sql).toContain("$13");
  });

  it("passes section_id as the 13th param (index 12)", async () => {
    await addRecipePaint(makeStepInput({ section_id: 99 }));
    const [, params] = executeMock.mock.calls[0];
    expect(params[12]).toBe(99);
  });

  it("null path: section_id null passes null as params[12]", async () => {
    await addRecipePaint(makeStepInput({ section_id: null }));
    const [, params] = executeMock.mock.calls[0];
    expect(params[12]).toBeNull();
  });
});

// Helper shared by hook invalidation groups (10-14)
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

// ---------------------------------------------------------------------------
// Group 8 — RecipeSection type shape (SECT-01)
// ---------------------------------------------------------------------------
describe("RecipeSection type shape — SECT-01", () => {
  it("interface has all 13 expected keys", () => {
    const section: RecipeSection = {
      id: 1,
      recipe_id: 2,
      name: "Armour",
      surface: "Metal",
      optional: 0,
      order_index: 0,
      notes: null,
      section_type: null,
      technique: null,
      execution_mode: null,
      applies_to: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const keys = Object.keys(section);
    expect(keys).toContain("id");
    expect(keys).toContain("recipe_id");
    expect(keys).toContain("name");
    expect(keys).toContain("surface");
    expect(keys).toContain("optional");
    expect(keys).toContain("order_index");
    expect(keys).toContain("notes");
    expect(keys).toContain("section_type");
    expect(keys).toContain("technique");
    expect(keys).toContain("execution_mode");
    expect(keys).toContain("applies_to");
    expect(keys).toContain("created_at");
    expect(keys).toContain("updated_at");
    expect(keys).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// Group 9 — RecipeStep includes section_id (SECT-02)
// ---------------------------------------------------------------------------
describe("RecipeStep includes section_id — SECT-02", () => {
  it("section_id is a key in the RecipeStep interface and can be null", () => {
    const step: RecipeStep = {
      id: 1,
      recipe_id: 1,
      paint_id: 2,
      step_name: "Basecoat",
      order_index: 0,
      notes: null,
      painting_phase: null,
      tool: null,
      technique: null,
      dilution: null,
      time_estimate_minutes: null,
      step_photo_path: null,
      alt_paint_id: null,
      section_id: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect("section_id" in step).toBe(true);
    expect(step.section_id).toBeNull();
  });

  it("section_id can be a number (assigned to a section)", () => {
    const step: RecipeStep = {
      id: 2,
      recipe_id: 1,
      paint_id: 3,
      step_name: "Shade",
      order_index: 1,
      notes: null,
      painting_phase: null,
      tool: null,
      technique: null,
      dilution: null,
      time_estimate_minutes: null,
      step_photo_path: null,
      alt_paint_id: null,
      section_id: 42,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(step.section_id).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Group 10 — useDeleteRecipeSection 5-key cascade invalidation (GAP-1)
// ---------------------------------------------------------------------------
describe("useDeleteRecipeSection — 5-key cascade invalidation contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates RECIPE_SECTIONS_KEY(recipeId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, recipeId: 3 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_SECTIONS_KEY(3));
  });

  it("invalidates RECIPE_PAINTS_KEY(recipeId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, recipeId: 3 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_PAINTS_KEY(3));
  });

  it("invalidates STEP_COUNTS_KEY on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, recipeId: 3 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(STEP_COUNTS_KEY);
  });

  it("invalidates RECIPE_AVAILABILITY_KEY on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, recipeId: 3 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_AVAILABILITY_KEY);
  });

  it("invalidates RECIPE_SWATCH_KEY on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, recipeId: 3 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_SWATCH_KEY);
  });

  it("invalidates exactly 5 keys total on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, recipeId: 3 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(5);
  });
});

// ---------------------------------------------------------------------------
// Group 11 — useCreateRecipeSection invalidation (GAP-2)
// ---------------------------------------------------------------------------
describe("useCreateRecipeSection — invalidates RECIPE_SECTIONS_KEY only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates RECIPE_SECTIONS_KEY(recipe_id) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateRecipeSection(), { wrapper });

    const input: CreateRecipeSectionInput = {
      recipe_id: 5,
      name: "Base",
      surface: null,
      optional: 0,
      order_index: 0,
      notes: null,
      section_type: null,
      technique: null,
      execution_mode: null,
      applies_to: null,
    };
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_SECTIONS_KEY(5));
  });

  it("invalidates exactly 1 key on success — does NOT invalidate paints/swatch/counts/availability", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateRecipeSection(), { wrapper });

    const input: CreateRecipeSectionInput = {
      recipe_id: 5,
      name: "Base",
      surface: null,
      optional: 0,
      order_index: 0,
      notes: null,
      section_type: null,
      technique: null,
      execution_mode: null,
      applies_to: null,
    };
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Group 12 — useUpdateRecipeSection invalidation (GAP-3)
// ---------------------------------------------------------------------------
describe("useUpdateRecipeSection — invalidates RECIPE_SECTIONS_KEY only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates RECIPE_SECTIONS_KEY(recipe_id) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 2, recipe_id: 8, name: "Skin" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_SECTIONS_KEY(8));
  });

  it("invalidates exactly 1 key on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateRecipeSection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 2, recipe_id: 8, name: "Skin" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Group 13 — useReorderRecipeSections invalidation (GAP-4)
// ---------------------------------------------------------------------------
describe("useReorderRecipeSections — invalidates RECIPE_SECTIONS_KEY only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates RECIPE_SECTIONS_KEY(recipeId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useReorderRecipeSections(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        sections: [
          { id: 1, order_index: 1 },
          { id: 2, order_index: 0 },
        ],
        recipeId: 11,
      });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_SECTIONS_KEY(11));
  });

  it("invalidates exactly 1 key on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useReorderRecipeSections(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        sections: [{ id: 1, order_index: 0 }],
        recipeId: 11,
      });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Group 14 — useSectionStepCounts Map transform (GAP-5)
// ---------------------------------------------------------------------------
describe("useSectionStepCounts — queryFn transforms rows into Map<number, number>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeMock.mockResolvedValue({ lastInsertId: 1 });
  });

  it("returns a Map where keys are section_id and values are step_count", async () => {
    const mockRows = [
      { section_id: 1, step_count: 3 },
      { section_id: 2, step_count: 7 },
    ];
    getSelectMock().mockResolvedValueOnce(mockRows);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSectionStepCounts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    expect(map).toBeInstanceOf(Map);
    expect(map.get(1)).toBe(3);
    expect(map.get(2)).toBe(7);
    expect(map.size).toBe(2);
  });

  it("returns an empty Map when there are no sections with steps", async () => {
    getSelectMock().mockResolvedValueOnce([]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSectionStepCounts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });

  it("uses section_id as the Map key — not an array index", async () => {
    // section_id 99 is non-sequential to confirm key identity
    const mockRows = [{ section_id: 99, step_count: 5 }];
    getSelectMock().mockResolvedValueOnce(mockRows);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSectionStepCounts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    expect(map.has(99)).toBe(true);
    expect(map.has(0)).toBe(false);
    expect(map.get(99)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Group 15 — getRecipePaintsByRecipe section-aware ordering (REC-05)
// ---------------------------------------------------------------------------
describe("getRecipePaintsByRecipe — section-aware ordering (REC-05)", () => {
  it("uses LEFT JOIN recipe_sections for section-aware step ordering", async () => {
    await getRecipePaintsByRecipe(1);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("LEFT JOIN recipe_sections s ON s.id = rs.section_id");
    expect(sql).toContain("COALESCE(s.order_index, 999999)");
    expect(sql).toContain("rs.order_index ASC");
    expect(params).toEqual([1]);
  });

  it("does not use the old non-section-aware ORDER BY pattern", async () => {
    await getRecipePaintsByRecipe(1);
    const [sql] = selectMock.mock.calls[0];
    expect(sql).not.toMatch(/ORDER BY order_index ASC$/m);
  });
});
