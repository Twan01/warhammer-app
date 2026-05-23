# Phase 97: Error Resilience - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 8 (3 new components, 2 modified files, 5 new test files)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/common/RouteErrorFallback.tsx` | component | request-response | `src/components/common/PlaceholderPage.tsx` | role-match |
| `src/components/common/DbHealthGate.tsx` | component | request-response | `src/db/queries/diagnostics.ts` (health logic) + `PlaceholderPage.tsx` (render) | partial |
| `src/components/common/DbDiagnosticScreen.tsx` | component | request-response | `src/components/common/PlaceholderPage.tsx` | role-match |
| `src/components/common/QueryProvider.tsx` | provider | event-driven | `src/components/common/QueryProvider.tsx` (self — modification) | exact |
| `src/main.tsx` | entry-point | event-driven | `src/main.tsx` (self — modification) | exact |
| `src/app/router.tsx` | config | request-response | `src/app/router.tsx` (self — modification) | exact |
| `tests/error-resilience/RouteErrorFallback.test.tsx` | test | request-response | `tests/collection/PaintingRing.test.tsx` | role-match |
| `tests/error-resilience/DbHealthGate.test.tsx` | test | request-response | `tests/data-health/diagnosticFlags.test.ts` | exact |
| `tests/error-resilience/QueryProviderGlobalError.test.tsx` | test | event-driven | `tests/app-shell/QueryProvider.test.tsx` | exact |
| `tests/error-resilience/routerErrorComponents.test.ts` | test | request-response | `tests/app-shell/QueryProvider.test.tsx` | role-match |
| `tests/error-resilience/globalErrorHandlers.test.ts` | test | event-driven | `tests/app-shell/QueryProvider.test.tsx` | role-match |

---

## Pattern Assignments

### `src/components/common/RouteErrorFallback.tsx` (component, request-response)

**Analog:** `src/components/common/PlaceholderPage.tsx` (layout/centering pattern)

**Imports pattern** — modeled on project shadcn/ui component conventions:
```typescript
import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
```

**Layout/centering pattern** (`src/components/common/PlaceholderPage.tsx` lines 7-9):
```typescript
// PlaceholderPage uses centered flex layout — copy this outer wrapper pattern
<div className="flex flex-col items-center justify-center h-full gap-2 text-center p-6">
```

**Core component pattern** — functional named export, inline prop types:
```typescript
// Named export, ErrorComponentProps from @tanstack/react-router
export function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
              {error.message}
              {error.stack && "\n" + error.stack}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>Reload Page</Button>
            <Button variant="outline" asChild>
              <Link to="/">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Dev-only guard pattern** — used throughout the codebase (`router.tsx` line 38, `QueryProvider.tsx` line 31):
```typescript
// From router.tsx line 38 and QueryProvider.tsx line 31 — identical pattern
{import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
// Apply same guard to error.message/stack display
```

---

### `src/components/common/DbHealthGate.tsx` (component, request-response)

**Analog (health logic):** `src/db/queries/diagnostics.ts` lines 76-95 — `getSchemaVersions` with `PRAGMA user_version` + `extractVersion` fallback

**Analog (render shell):** `src/components/common/PlaceholderPage.tsx` lines 1-13

**DB query pattern from `diagnostics.ts`** (lines 76-95 — copy `extractVersion` exactly):
```typescript
// From src/db/queries/diagnostics.ts lines 83-90
const extractVersion = (row: Record<string, number> | undefined): number => {
  if (!row) return 0;
  if (typeof row.user_version === "number") return row.user_version;
  // Fallback: read the first numeric value from the result object
  const values = Object.values(row);
  return typeof values[0] === "number" ? values[0] : 0;
};
```

**DB singleton call pattern from `client.ts`** (lines 22-34):
```typescript
// From src/db/client.ts lines 22-34 — getDb() is the only DB access point
import { getDb } from "@/db/client";
const db = await getDb();
await db.select("SELECT 1");
// getDb() resets _dbPromise = null on failure — retry is safe
```

**Core component pattern:**
```typescript
// EXPECTED_SCHEMA_VERSION must be a named constant for future migration tracking
const EXPECTED_SCHEMA_VERSION = 32; // matches src-tauri/migrations/ 001–032

type HealthState = "checking" | "ok" | "failed";

export function DbHealthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>("checking");
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setState("checking");
    try {
      const db = await getDb();
      await db.select("SELECT 1");
      const versionRows = await db.select<Record<string, number>[]>(
        "PRAGMA user_version"
      );
      const version = extractVersion(versionRows[0]);
      if (version < EXPECTED_SCHEMA_VERSION) {
        throw new Error(
          `Schema version mismatch: expected ${EXPECTED_SCHEMA_VERSION}, got ${version}. ` +
          `Migrations may not have run. Try restarting the app.`
        );
      }
      setState("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("failed");
    }
  }, []);

  useEffect(() => { void runCheck(); }, [runCheck]);

  if (state === "checking") return null; // check completes before next paint in normal operation
  if (state === "failed") return <DbDiagnosticScreen error={error} onRetry={runCheck} />;
  return <>{children}</>;
}
```

**Imports pattern:**
```typescript
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { getDb } from "@/db/client";
import { DbDiagnosticScreen } from "./DbDiagnosticScreen";
```

---

### `src/components/common/DbDiagnosticScreen.tsx` (component, request-response)

**Analog:** `src/components/common/PlaceholderPage.tsx` (centered layout) + shadcn Alert for warnings

**Imports pattern:**
```typescript
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
```

**Core pattern** — prop types inline, named export:
```typescript
interface DbDiagnosticScreenProps {
  error: string | null;
  onRetry: () => void;
}

export function DbDiagnosticScreen({ error, onRetry }: DbDiagnosticScreenProps) {
  // Centered Card with error message, Retry button, troubleshooting guidance
  // No auto-repair — inform and retry only (D-04)
}
```

---

### `src/components/common/QueryProvider.tsx` (provider, event-driven) — MODIFICATION

**Analog:** `src/components/common/QueryProvider.tsx` lines 1-33 (self)

**Existing file** (`QueryProvider.tsx` lines 1-33 — read in full above):
```typescript
// CURRENT: QueryClient with only defaultOptions
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

**Add pattern** — import `QueryCache` and `MutationCache`, pass them to `QueryClient`:
```typescript
// ADD to import: QueryCache, MutationCache
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";

// REPLACE QueryClient constructor:
new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("[ReactQuery] Query failed:", {
        timestamp: new Date().toISOString(),
        queryKey: query.queryKey,
        error: error.message,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error("[ReactQuery] Mutation failed:", {
        timestamp: new Date().toISOString(),
        mutationKey: mutation.options.mutationKey,
        error: error.message,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

---

### `src/main.tsx` (entry-point, event-driven) — MODIFICATION

**Analog:** `src/main.tsx` lines 1-17 (self — full file read above)

**Existing render call** (`main.tsx` lines 9-17):
```typescript
// CURRENT:
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <QuickAddProvider>
        <RouterProvider router={router} />
      </QuickAddProvider>
    </QueryProvider>
  </React.StrictMode>
);
```

**Add pattern — window handlers before createRoot, DbHealthGate wrapping QueryProvider:**
```typescript
// REGISTER BEFORE ReactDOM.createRoot (D-08 / ERR-04):
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[GlobalError]", {
    timestamp: new Date().toISOString(),
    type: "uncaught",
    message,
    source,
    location: `${lineno}:${colno}`,
    stack: error?.stack,
  });
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error("[UnhandledRejection]", {
    timestamp: new Date().toISOString(),
    type: "unhandledRejection",
    reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
};

// UPDATED render — DbHealthGate wraps QueryProvider (D-05, must be outside React Query):
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DbHealthGate>
      <QueryProvider>
        <QuickAddProvider>
          <RouterProvider router={router} />
        </QuickAddProvider>
      </QueryProvider>
    </DbHealthGate>
  </React.StrictMode>
);
```

**Add import:**
```typescript
import { DbHealthGate } from "@/components/common/DbHealthGate";
```

---

### `src/app/router.tsx` (config, request-response) — MODIFICATION

**Analog:** `src/app/router.tsx` lines 47-74 (self — full file read above)

**Existing layout routes** (`router.tsx` lines 47-57 and 63-74 — no `errorComponent`):
```typescript
// CURRENT layoutRoute (lines 47-57):
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});

// CURRENT bareLayoutRoute (lines 63-74):
const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "bare-layout",
  component: () => (
    <ActiveFactionProvider>
      <TooltipProvider delayDuration={200}>
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ActiveFactionProvider>
  ),
});
```

**Add pattern — `errorComponent` prop on both layout routes:**
```typescript
// ADD import at top of router.tsx:
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";

// MODIFIED layoutRoute — add errorComponent:
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  errorComponent: RouteErrorFallback,   // ERR-01 + ERR-02
  component: () => ( /* unchanged */ ),
});

// MODIFIED bareLayoutRoute — add errorComponent:
const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "bare-layout",
  errorComponent: RouteErrorFallback,   // ERR-02 isolation for painting mode
  component: () => ( /* unchanged */ ),
});
```

---

## Test Pattern Assignments

### `tests/error-resilience/RouteErrorFallback.test.tsx`

**Analog:** `tests/collection/PaintingRing.test.tsx` (component render + attribute assertions)

**Test structure pattern** (`PaintingRing.test.tsx` lines 1-38):
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";

describe("RouteErrorFallback — ERR-01", () => {
  it("renders 'Something went wrong' heading", () => { ... });
  it("hides error message in PROD (import.meta.env.DEV = false)", () => { ... });
  it("shows error message in DEV (import.meta.env.DEV = true)", () => { ... });
  it("calls reset() when 'Reload Page' button is clicked", () => { ... });
});
```

**DEV env stub pattern** (Vitest built-in):
```typescript
import { vi } from "vitest";
// Stub import.meta.env.DEV for prod/dev visibility tests
vi.stubEnv("DEV", false);  // or true
```

**Mock reset function:**
```typescript
const mockReset = vi.fn();
render(<RouteErrorFallback error={new Error("test")} reset={mockReset} />);
```

**Note:** `RouteErrorFallback` uses `Link` from `@tanstack/react-router` — wrap render in a minimal router:
```typescript
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
// Same makeRouter pattern as tests/app-shell/AppSidebar.test.tsx lines 27-32
```

---

### `tests/error-resilience/DbHealthGate.test.tsx`

**Analog:** `tests/data-health/diagnosticFlags.test.ts` lines 1-34 (exact mock pattern for `getDb`)

**Mock pattern** (`diagnosticFlags.test.ts` lines 14-19):
```typescript
const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

// Import AFTER vi.mock
import { DbHealthGate } from "@/components/common/DbHealthGate";
```

**Test cases:**
```typescript
describe("DbHealthGate — ERR-03", () => {
  it("renders children when health check passes (version >= 32)", async () => { ... });
  it("renders DbDiagnosticScreen when getDb() throws", async () => { ... });
  it("renders DbDiagnosticScreen when user_version < 32", async () => { ... });
  it("Retry button re-runs the health check", async () => { ... });
});
```

**Render with async state pattern** (`UnitDeleteDialog.test.tsx` lines 55-60):
```typescript
// Wrap in QueryClientProvider if children need React Query
// DbHealthGate sits OUTSIDE QueryProvider — no QueryClient wrapper needed here
render(<DbHealthGate><span data-testid="child">OK</span></DbHealthGate>);
expect(await screen.findByTestId("child")).toBeInTheDocument();
```

---

### `tests/error-resilience/QueryProviderGlobalError.test.tsx`

**Analog:** `tests/app-shell/QueryProvider.test.tsx` lines 1-55 (full file — exact Inspector pattern)

**Inspector component pattern** (`QueryProvider.test.tsx` lines 13-24):
```typescript
// Inspect QueryClient internals via useQueryClient
function Inspector() {
  const client = useQueryClient();
  // Assert queryCache and mutationCache have onError configured
  return <div data-testid="has-query-cache">{String(!!client.getQueryCache())}</div>;
}
```

**Test structure:**
```typescript
describe("QueryProvider — ERR-04 (global error capture)", () => {
  it("creates QueryClient with QueryCache onError handler", () => { ... });
  it("creates QueryClient with MutationCache onError handler", () => { ... });
  it("QueryCache onError logs to console.error with queryKey and timestamp", () => { ... });
  it("MutationCache onError logs to console.error with mutationKey and timestamp", () => { ... });
});
```

**console.error spy pattern:**
```typescript
import { vi, beforeEach } from "vitest";
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
beforeEach(() => consoleSpy.mockClear());
```

---

### `tests/error-resilience/routerErrorComponents.test.ts`

**Analog:** `tests/app-shell/QueryProvider.test.tsx` (import and assert, no render needed)

**Pattern — import routes and assert `errorComponent` property:**
```typescript
import { describe, it, expect } from "vitest";
// Import router exports — layoutRoute and bareLayoutRoute are not exported currently;
// may need to export them or import `router` and inspect routeTree
import { router } from "@/app/router";

describe("Router layout routes — ERR-02", () => {
  it("layoutRoute has errorComponent set", () => {
    // Assert via router's route tree introspection
  });
  it("bareLayoutRoute has errorComponent set", () => { ... });
});
```

**Note for planner:** `layoutRoute` and `bareLayoutRoute` are currently unexported from `router.tsx`. Exporting them (or checking the routeTree structure) is needed for testability. The simpler approach: export both from `router.tsx` alongside the existing `router` export.

---

### `tests/error-resilience/globalErrorHandlers.test.ts`

**Analog:** `tests/app-shell/QueryProvider.test.tsx` (structure); pattern is window handler invocation

**Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// main.tsx registers handlers on import — may need dynamic import or direct registration
describe("Global error handlers — ERR-04", () => {
  it("window.onerror logs structured context to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Call handler directly after import sets it up
    window.onerror?.("test message", "test.ts", 1, 1, new Error("test"));
    expect(spy).toHaveBeenCalledWith("[GlobalError]", expect.objectContaining({
      message: "test message",
      timestamp: expect.any(String),
    }));
    spy.mockRestore();
  });

  it("window.onunhandledrejection logs structured context to console.error", () => { ... });
});
```

---

## Shared Patterns

### Dev-only content guard
**Source:** `src/app/router.tsx` line 38, `src/components/common/QueryProvider.tsx` line 31
**Apply to:** `RouteErrorFallback.tsx` (error.message/stack display), `DbDiagnosticScreen.tsx` (raw error details)
```typescript
{import.meta.env.DEV && <pre>{error.message}</pre>}
```

### Named export + inline prop types
**Source:** All components in `src/components/common/` — `PlaceholderPage.tsx` lines 1-13, `PaintingRing.tsx`, etc.
**Apply to:** `RouteErrorFallback.tsx`, `DbHealthGate.tsx`, `DbDiagnosticScreen.tsx`
```typescript
// Pattern: named function export, prop types inline as interface or literal
export function ComponentName({ prop }: { prop: Type }) { ... }
// OR for multi-prop components:
interface ComponentNameProps { prop: Type; }
export function ComponentName({ prop }: ComponentNameProps) { ... }
```

### `getDb()` call + async error handling
**Source:** `src/db/queries/diagnostics.ts` lines 45-51 (getTableCounts), `src/db/client.ts` lines 22-34
**Apply to:** `DbHealthGate.tsx` health check logic
```typescript
// Always: const db = await getDb(); then db.select(...)
// getDb() resets singleton on failure — safe to retry
const db = await getDb();
const rows = await db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM ...");
```

### `PRAGMA user_version` extractVersion fallback
**Source:** `src/db/queries/diagnostics.ts` lines 83-90
**Apply to:** `DbHealthGate.tsx` (copy this function verbatim — handles driver column name variance)
```typescript
const extractVersion = (row: Record<string, number> | undefined): number => {
  if (!row) return 0;
  if (typeof row.user_version === "number") return row.user_version;
  const values = Object.values(row);
  return typeof values[0] === "number" ? values[0] : 0;
};
```

### vi.mock `@/db/client` for tests
**Source:** `tests/data-health/diagnosticFlags.test.ts` lines 14-19
**Apply to:** `tests/error-resilience/DbHealthGate.test.tsx`
```typescript
const mockSelect = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));
// Always import module under test AFTER vi.mock calls
```

### Test file header comment style
**Source:** `tests/data-health/diagnosticFlags.test.ts` lines 1-11, `tests/collection/PaintingRing.test.tsx` lines 1-9
**Apply to:** All new test files in `tests/error-resilience/`
```typescript
/**
 * ERR-XX — [Short description of what is being tested].
 *
 * [One sentence on approach / key pitfall to document.]
 */
```

### console.error spy for handler tests
**Source:** Pattern established across test suite (`vi.spyOn` usage)
**Apply to:** `globalErrorHandlers.test.ts`, `QueryProviderGlobalError.test.tsx`
```typescript
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
beforeEach(() => consoleSpy.mockClear());
// Assert: expect(consoleSpy).toHaveBeenCalledWith(prefix, expect.objectContaining({ ... }));
```

---

## No Analog Found

All new files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively — though `RouteErrorFallback.tsx` is a first-of-kind component (no existing error boundary component) and should use the RESEARCH.md `ErrorComponentProps` type verbatim.

---

## Export Change Required

| File | Change Needed | Reason |
|---|---|---|
| `src/app/router.tsx` | Export `layoutRoute` and `bareLayoutRoute` | Required for `routerErrorComponents.test.ts` to assert `errorComponent` is set on each route |

This is a minor addition: `export const layoutRoute = ...` and `export const bareLayoutRoute = ...`.

---

## Metadata

**Analog search scope:** `src/components/common/`, `src/db/`, `src/db/queries/`, `src/main.tsx`, `src/app/router.tsx`, `tests/`
**Files read:** 11 source files + 4 test files
**Pattern extraction date:** 2026-05-22
