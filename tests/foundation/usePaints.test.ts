/**
 * Phase 6 Success Criteria 5 — usePaints mutations invalidate both
 * PAINTS_KEY (['paints']) and PAINTS_WITH_RECIPES_KEY (['paints-with-recipes']).
 *
 * Wave 0: skip-stub. 06-04 fills these in using QueryClient + renderHook
 * + a spy on queryClient.invalidateQueries.
 */
describe("usePaints — PAINTS_WITH_RECIPES_KEY constant", () => {
  it.skip("PAINTS_WITH_RECIPES_KEY equals ['paints-with-recipes'] literal", () => {});
});

describe("usePaints — useCreatePaint onSuccess invalidations", () => {
  it.skip("invalidates PAINTS_KEY (['paints'])", () => {});
  it.skip("invalidates PAINTS_WITH_RECIPES_KEY (['paints-with-recipes'])", () => {});
});

describe("usePaints — useUpdatePaint onSuccess invalidations", () => {
  it.skip("invalidates PAINTS_KEY", () => {});
  it.skip("invalidates PAINT_KEY(id) for the updated paint", () => {});
  it.skip("invalidates PAINTS_WITH_RECIPES_KEY", () => {});
});

describe("usePaints — useDeletePaint onSuccess invalidations", () => {
  it.skip("invalidates PAINTS_KEY", () => {});
  it.skip("invalidates PAINTS_WITH_RECIPES_KEY", () => {});
});

describe("usePaintsWithRecipeCount", () => {
  it.skip("queries with key PAINTS_WITH_RECIPES_KEY and queryFn getPaintsWithRecipeCount", () => {});
});
