/**
 * Phase 13 — JournalTab render tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 13-03 will:
 *   1. Create src/features/units/JournalTab.tsx accepting `unitId: number` prop.
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 13-VALIDATION.md row JOUR-05 (render skeleton/grid states).
 *
 * The stub exists in Wave 0 so Plan 13-03 has a concrete failing-or-skipped vitest target.
 */
import { describe, it } from "vitest";

describe("JournalTab — Wave 0 stubs", () => {
  it.skip("JOUR-05: renders Skeleton elements while useUnitPhotos is loading (isLoading: true)", () => {
    // Plan 13-03 will:
    //   - vi.mock("@/hooks/useJournalSessions", () => ({ useJournalSessions: () => ({ data: [], isLoading: false }) }))
    //   - vi.mock("@/hooks/useUnitPhotos", () => ({ useUnitPhotos: () => ({ data: undefined, isLoading: true }) }))
    //   - render <QueryClientProvider><JournalTab unitId={1} /></QueryClientProvider>
    //   - assert document.querySelectorAll('[data-slot="skeleton"]').length >= 1 (shadcn Skeleton has data-slot)
    //     OR assert at least one element with className containing "animate-pulse" (Skeleton's animation class)
  });

  it.skip("JOUR-05: renders 3-column thumbnail grid (grid-cols-3) when useUnitPhotos returns data", () => {
    // Plan 13-03 will:
    //   - vi.mock useJournalSessions and useUnitPhotos:
    //     useUnitPhotos returns { data: [
    //       { id: 1, file_path: "a.jpg", stage_label: "Primed", caption: null, taken_at: "2026-05-03", assetUrl: "asset://localhost/a.jpg" },
    //       { id: 2, file_path: "b.jpg", stage_label: "Finished", caption: "Done", taken_at: "2026-05-02", assetUrl: "asset://localhost/b.jpg" },
    //     ], isLoading: false }
    //   - render <QueryClientProvider><JournalTab unitId={1} /></QueryClientProvider>
    //   - assert document.querySelector('.grid-cols-3') !== null
    //   - assert screen.getAllByRole("img").length === 2
    //   - assert at least one element contains text "Primed" and another "Finished" (stage labels rendered)
  });
});
