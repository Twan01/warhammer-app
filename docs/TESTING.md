<!-- generated-by: gsd-doc-writer -->
# Testing

HobbyForge uses Vitest with React Testing Library for all frontend and data-layer tests, running in a jsdom environment.

## Test framework and setup

| Component | Package | Version |
|---|---|---|
| Test runner | `vitest` | ^4.1.5 |
| UI for runner | `@vitest/ui` | ^4.1.5 |
| DOM environment | `jsdom` | ^29.1.1 |
| React rendering | `@testing-library/react` | ^16.3.2 |
| User interactions | `@testing-library/user-event` | ^14.6.1 |
| DOM matchers | `@testing-library/jest-dom` | ^6.9.1 |
| SQLite (data-layer tests) | `better-sqlite3` | ^12.10.0 |

Configuration lives in `vitest.config.ts` at the project root:

- **Environment:** `jsdom` (default for all tests)
- **Globals:** enabled (`describe`, `it`, `expect` available without imports)
- **Setup file:** `tests/setup.ts` runs before every test file
- **Test pattern:** `tests/**/*.test.ts` and `tests/**/*.test.tsx`
- **Reporter:** `verbose`
- **Path alias:** `@/` resolves to `src/` (matches the app's Vite/TypeScript alias)

### Global setup (`tests/setup.ts`)

The setup file handles several jsdom gaps required by the UI library stack:

- Registers `@testing-library/jest-dom/vitest` matchers (e.g., `toBeInTheDocument`)
- Polyfills `ResizeObserver` (needed by `cmdk` Command components)
- Polyfills `Element.scrollIntoView` (needed by `cmdk` item navigation)
- Polyfills `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture` (needed by Radix UI pointer events)
- Runs `cleanup()` from React Testing Library after each test to prevent leaked DOM

### Data-layer tests

Tests in `tests/data-layer/` use a separate approach: they opt into the Node environment with `// @vitest-environment node` at the top of the file and use `better-sqlite3` directly to run the full migration chain against an in-memory SQLite database. The shared helper `tests/data-layer/db-helpers.ts` provides `createHobbyforgeDb()` and `createRulesDb()` factory functions that apply all migrations in order and return a database handle.

## Running tests

### Full test suite (single pass)

```bash
pnpm test
```

Runs `vitest run` -- executes all tests once and exits. This is the command used for CI-style checks.

### Watch mode

```bash
pnpm test:watch
```

Runs `vitest` in watch mode. Re-runs affected tests on file save. Recommended during development.

### Single file

```bash
pnpm test -- tests/collection/collectionFilters.test.ts
```

Pass a relative path after `--` to run a specific test file.

### Single test by name

```bash
pnpm test -- -t "starts with empty filters"
```

The `-t` flag filters by test name (substring match).

### Vitest UI

```bash
pnpm vitest --ui
```

Opens the Vitest browser UI for interactive test exploration (requires `@vitest/ui`).

## Writing new tests

### File naming and location

Tests live in the `tests/` directory and mirror the `src/features/` structure:

```
tests/
  analytics/           # tests for src/features/dashboard analytics
  army-list/           # tests for army list feature
  collection/          # tests for unit collection feature
  dashboard/           # tests for dashboard components and hooks
  data-health/         # tests for backup/diagnostics feature
  data-layer/          # schema and migration tests (Node environment)
  datasheet/           # tests for rules datasheet feature
  design-foundation/   # tests for shared UI components
  error-resilience/    # tests for error boundaries and handlers
  foundation/          # tests for core migrations and utilities
  game-day/            # tests for game day feature
  goals/               # tests for hobby goals feature
  hobby-journal/       # tests for journal/photo feature
  lib/                 # tests for pure utility functions
  navigation/          # tests for sidebar and quick-add
  paint-inventory/     # tests for paint inventory feature
  painting/            # tests for painting projects feature
  painting-mode/       # tests for focused painting mode
  performance/         # performance-related tests
  recipes/             # tests for painting recipes feature
  rules-hub/           # tests for rules hub UI
  rules-sync/          # tests for rules CSV sync
  spending/            # tests for spending tracker
  theming/             # tests for theme/faction context
  types/               # tests for shared type definitions
  units/               # tests for unit CRUD
  wishlist/            # tests for wishlist feature
  workshop-play/       # tests for workshop/play features
  setup.ts             # global setup (loaded by vitest.config.ts)
```

The project currently has **253 test files** across 34 test directories.

### Naming convention

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.tsx` or `useHookName.test.ts`
- Pure function tests: `functionName.test.ts`
- Store tests: `storeName.test.ts`
- Migration tests: `migrationNNN.test.ts`
- Some files use descriptive suffixes: `AppSidebar.nav01.test.tsx`, `journalTab.fix.test.ts`

### Common test patterns

**Mocking React Query hooks** -- the standard approach for component tests:

```typescript
import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Set up controllable mock state
let mockData: MyType[] | undefined = [];
let mockIsLoading = false;

vi.mock("@/hooks/useMyEntity", () => ({
  useMyEntity: () => ({ data: mockData, isLoading: mockIsLoading }),
}));

// Import the component AFTER vi.mock declarations
import { MyComponent } from "@/features/myFeature/MyComponent";
```

**Testing Zustand stores** -- call `getState()` and `setState()` directly:

```typescript
import { useMyStore } from "@/features/myFeature/myStore";

describe("myStore", () => {
  beforeEach(() => useMyStore.setState(initialState));

  it("updates on action", () => {
    useMyStore.getState().someAction("value");
    expect(useMyStore.getState().field).toBe("value");
  });
});
```

**Data-layer tests** -- use better-sqlite3 with the Node environment:

```typescript
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

describe("schema test", () => {
  let db: Database.Database;
  beforeEach(() => { db = createHobbyforgeDb(); });
  afterEach(() => { db.close(); });

  it("table exists", () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    // assertions...
  });
});
```

### Tauri API mocking

Since tests run in jsdom (no native Tauri bridge), all Tauri plugin imports must be mocked. Use `vi.mock` for any `@tauri-apps/*` import before the component under test is imported.

## Coverage requirements

No coverage threshold is configured. The vitest configuration does not include `coverageThreshold` or a coverage provider. Tests focus on correctness rather than enforcing a minimum coverage percentage.

To generate an ad-hoc coverage report, run:

```bash
pnpm vitest run --coverage
```

This requires a coverage provider (e.g., `@vitest/coverage-v8`) to be installed.

## CI integration

The project has a single GitHub Actions workflow: `.github/workflows/release.yml`. This workflow is triggered by tag pushes (`v*`) and handles building and publishing releases via `tauri-apps/tauri-action`. It runs `pnpm install` and the Tauri build process but **does not include a dedicated test step** in the CI pipeline.

Tests are run locally before committing. There is no separate CI workflow that gates pull requests on test passage.
