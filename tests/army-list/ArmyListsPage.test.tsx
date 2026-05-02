/**
 * ARMY-06 — Wave 0 stub tests for ArmyListsPage.
 *
 * STATUS: skipped. Plan 08-04 will:
 *   1. Create src/features/army-lists/ArmyListsPage.tsx (card grid + empty state).
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions matching 08-UI-SPEC.md §ArmyListsPage and
 *      §Copywriting Contract (empty state heading "Build your first army list").
 *
 * The stub exists in Wave 0 so the Nyquist sampling rate
 * (`pnpm test` after every task in plan 04) has a concrete failing
 * target to flip green.
 */
import { describe, it } from "vitest";

describe.skip("ArmyListsPage — ARMY-06", () => {
  it("empty state: when useArmyLists returns [], renders 'Build your first army list' heading and a 'New List' CTA button", () => {
    // Plan 04 will:
    //   - Mock @/db/queries/armyLists getArmyLists to resolve []
    //   - Render <ArmyListsPage /> in a QueryClientProvider + RouterProvider wrapper
    //   - Assert screen.findByText("Build your first army list")
    //   - Assert getByRole("button", { name: "New List" })
  });

  it("loading state: while useArmyLists is pending, renders skeletons (shadcn <Skeleton>) instead of the card grid", () => {
    // Plan 04 will:
    //   - Mock getArmyLists to a never-resolving promise
    //   - Render <ArmyListsPage />
    //   - Assert at least one element with the .animate-pulse class (shadcn Skeleton signature) is present
  });

  it("populated state: when useArmyLists returns 2 lists, renders 2 cards with list names visible and one card per list", () => {
    // Plan 04 will:
    //   - Mock getArmyLists to resolve [{ id: 1, name: "List A", ... }, { id: 2, name: "List B", ... }]
    //   - Render <ArmyListsPage />
    //   - Assert screen.findAllByRole("link" or "button" — depending on Card markup) has length 2 OR getByText("List A") and getByText("List B") both present
  });
});
