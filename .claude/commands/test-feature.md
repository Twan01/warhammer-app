Generate comprehensive Vitest tests for the HobbyForge feature: $ARGUMENTS

## Steps

1. **Read the feature source files** to understand what needs testing:
   - `src/features/<kebab-name>/` — all component files
   - `src/hooks/use<PascalName>s.ts` — the React Query hook being mocked
   - `src/db/queries/<kebab-name>.ts` — the query functions being tested
   - Check `tests/<kebab-name>/` to see if any tests already exist

2. **Read the test setup** to follow conventions:
   - `tests/setup.ts` — global jest-dom matchers, ResizeObserver polyfill
   - An existing test file for reference, e.g. `tests/foundation/units.test.ts` or `tests/army-list/ArmyListPage.test.tsx`

3. **Create test files** at `tests/<kebab-name>/`:

   **a. `<kebab-name>-queries.test.ts`** — unit tests for `src/db/queries/<kebab-name>.ts`
   ```ts
   import { vi, describe, it, expect, beforeEach } from "vitest";

   // Mock the Tauri SQL plugin — no native bridge in jsdom
   vi.mock("@tauri-apps/plugin-sql", () => ({
     default: { load: vi.fn() },
   }));

   // Mock the db client
   vi.mock("@/db/client", () => ({
     getDb: vi.fn(),
   }));
   ```
   - Test each exported function: getAll, getById, create, update, delete
   - Verify `$1, $2` parameter passing
   - Verify boolean casting (reads return `Boolean()`, writes pass `0`/`1`)
   - Verify `lastInsertId` returned from create

   **b. `<PascalName>Page.test.tsx`** — integration tests for the page component
   ```ts
   import { render, screen, fireEvent, waitFor } from "@testing-library/react";
   import { vi, describe, it, expect } from "vitest";

   // Mock the hook so no DB calls happen
   vi.mock("@/hooks/use<PascalName>s", () => ({
     use<PascalName>s: vi.fn(),
     useCreate<PascalName>: vi.fn(),
     useUpdate<PascalName>: vi.fn(),
     useDelete<PascalName>: vi.fn(),
   }));
   ```
   - Test: renders empty state when no data
   - Test: renders list of items when data present
   - Test: search/filter input narrows results
   - Test: "New" button opens the Sheet
   - Test: Edit button on a row opens Sheet with correct item

   **c. `apply<PascalName>Filters.test.ts`** — pure function tests (no mocking needed)
   - Test each filter dimension independently
   - Test combined filters
   - Test empty input returns all items
   - Test no matches returns empty array

4. **Follow project conventions**:
   - `vi.mock` calls at the top level (hoisted)
   - `beforeEach(() => vi.clearAllMocks())` in each describe block
   - Use `@testing-library/user-event` for interactions where possible
   - Wrap renders in a `QueryClientProvider` with a fresh client when React Query is involved
   - No snapshots — assert on specific text, roles, and behaviors

5. **Run the tests** with `pnpm test -- tests/<kebab-name>/` and fix any failures before reporting done.
