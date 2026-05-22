# Phase 97: Error Resilience - Research

**Researched:** 2026-05-22
**Domain:** React error boundaries, TanStack Router errorComponent, React Query global error capture, SQLite startup health gate
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Place error boundaries at the layout route level — one on `layoutRoute` and one on `bareLayoutRoute`. A crash on one route section does not affect another.
- **D-02:** Use TanStack Router's built-in `errorComponent` prop on the two layout routes. No manual class-component wrapping every route.
- **D-03:** On startup, run a lightweight health check (`SELECT 1` + verify schema version from migrations) before rendering the main router.
- **D-04:** The diagnostic screen shows error message, Retry button, and basic troubleshooting guidance. No auto-repair.
- **D-05:** Implement as a wrapper component in `main.tsx` using `useState`/`useEffect`. No Suspense or React Query for this one-time check.
- **D-06:** Error fallback is a styled shadcn/ui Card with: error icon, "Something went wrong" heading, error message (dev only), "Reload Page" button, and "Go to Dashboard" link.
- **D-07:** In production builds, hide the raw error message/stack. In dev mode, show full error details.
- **D-08:** Register `window.onerror` and `window.onunhandledrejection` handlers in `main.tsx` that log structured context to `console.error`.
- **D-09:** Add a global `onError` handler to the React Query `QueryClient` via `QueryCache` and `MutationCache` (not `defaultOptions`) so failed queries/mutations are logged with their query key.

### Claude's Discretion
- Error boundary component file location and naming
- Exact health check query (`SELECT 1` vs `PRAGMA integrity_check` — see Section: DB Health Check)
- Whether to use a React class component or functional approach for error boundaries

### Deferred Ideas (OUT OF SCOPE)
- **FUT-04 (persistent error logging):** Component-level error logging to persistent storage
- **Error reporting service:** No external error reporting needed for a local desktop app
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ERR-01 | App renders a fallback UI (not blank screen) when any component throws during render | TanStack Router `errorComponent` on layout routes + shadcn Card fallback |
| ERR-02 | Each route has its own error boundary — a crash on one page doesn't break other pages | TanStack Router per-layout-route isolation via `errorComponent` on `layoutRoute` and `bareLayoutRoute` |
| ERR-03 | App verifies DB connection and schema integrity before rendering the main layout | Startup gate wrapper in `main.tsx` using `SELECT 1` + `PRAGMA user_version` |
| ERR-04 | Unhandled promise rejections and uncaught errors are captured and logged (not silently swallowed) | `window.onerror`, `window.onunhandledrejection` in `main.tsx` + `QueryCache`/`MutationCache` `onError` |
</phase_requirements>

---

## Summary

This phase adds defensive error-handling infrastructure across four integration points: (1) route-level error boundaries via TanStack Router's `errorComponent` prop on the two existing layout routes, (2) a startup DB health gate wrapping `RouterProvider` in `main.tsx`, (3) global window error handlers for uncaught exceptions and unhandled promise rejections, and (4) React Query `QueryCache`/`MutationCache` global `onError` callbacks. No new packages are required — all patterns use tools already in the project.

The most important discovery is the distinction between `QueryCache`/`MutationCache` `onError` (true global, always fires) vs. `defaultOptions.queries.onError` (per-observer default, can be overridden, removed from React Query v5). The `QueryCache` approach is the correct v5 pattern. TanStack Router's `errorComponent` is a React-based error boundary wrapper built into every route; placing it on the two layout routes provides the exact isolation requested in D-01/D-02.

For the DB health check (D-03/ERR-03), `PRAGMA integrity_check` is inappropriate at startup — it runs O(N log N) and can take seconds-to-minutes on larger databases. The correct approach is `SELECT 1` (connectivity probe) combined with `PRAGMA user_version` (schema migration check). The project already uses `PRAGMA user_version` in `diagnostics.ts` and the expected version is **32** (latest migration: `032_army_list_snapshots.sql`).

**Primary recommendation:** Implement error boundaries as functional components receiving `ErrorComponentProps` from `@tanstack/react-router`, placed directly on `layoutRoute` and `bareLayoutRoute` via the `errorComponent` prop. Implement the DB gate as a `DbHealthGate` wrapper in `main.tsx`. Register window handlers before `ReactDOM.createRoot`. Wire `QueryCache`/`MutationCache` `onError` in `QueryProvider.tsx`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route-level error fallback UI | Frontend (React/Router) | — | Error boundaries live in the render tree; TanStack Router's `errorComponent` is per-route |
| DB startup health gate | Frontend (React) | DB singleton | Gate wraps the entire app before React renders routes; DB ping uses existing `getDb()` |
| Global uncaught error capture | Frontend (window) | — | `window.onerror` / `window.onunhandledrejection` are browser-level; registered before React mounts |
| React Query global error logging | Frontend (React Query client) | — | `QueryCache`/`MutationCache` callbacks live inside the `QueryClient` created in `QueryProvider.tsx` |

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-router` | 1.168.26 | `errorComponent` prop on routes | Built-in; no extra package needed |
| `react` | 19.2.5 | `ErrorComponentProps` is a functional interface | Class component still possible but not required for TanStack Router's `errorComponent` |
| `@tanstack/react-query` | 5.100.6 | `QueryCache` / `MutationCache` global `onError` | Verified in installed package types |
| shadcn/ui `card`, `button`, `alert` | (project-managed) | Styled error fallback, diagnostic screen | Already used in the project |
| `lucide-react` | 0.460.0 | Error icon (AlertTriangle, XCircle) | Already in project |

**No new packages to install.** All capabilities are provided by existing dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Router `errorComponent` on layout routes | `react-error-boundary` package | `react-error-boundary` is not installed and adds no capability beyond what `errorComponent` provides here; adds a dependency |
| React functional component for error fallback | React class component `ErrorBoundary` | TanStack Router's `errorComponent` is a render prop that receives `error`/`reset` — React class components are only needed when manually wrapping components outside TanStack Router |
| `SELECT 1` + `PRAGMA user_version` health check | `PRAGMA integrity_check` or `PRAGMA quick_check` | `integrity_check` is O(N log N); inappropriate for startup. `quick_check` is O(N) but still slower. `SELECT 1` + version check is the right tradeoff. |
| `QueryCache`/`MutationCache` `onError` | `defaultOptions.queries.onError` | `defaultOptions` `onError` was removed in React Query v5. `QueryCache` pattern is the v5-correct approach — always fires, cannot be overridden per-hook. |

---

## Package Legitimacy Audit

**No new packages are required for this phase.** All implementation uses existing dependencies.

*Package legitimacy gate: SKIPPED — no new package installations.*

---

## Architecture Patterns

### System Architecture Diagram

```
main.tsx startup
    │
    ├── Register window.onerror + window.onunhandledrejection
    │
    └── DbHealthGate (useState: idle | checking | ok | failed)
           │
           ├── [failed] → <DbDiagnosticScreen error={...} onRetry={...} />
           │
           └── [ok] → <QueryProvider>          ← QueryCache/MutationCache onError wired here
                          └── <RouterProvider>
                                 │
                                 ├── rootRoute
                                 │     └── layoutRoute  errorComponent={RouteErrorFallback}
                                 │           ├── dashboardRoute
                                 │           ├── collectionRoute
                                 │           ├── armyListsRoute
                                 │           └── ... (all standard routes)
                                 │
                                 └── rootRoute
                                       └── bareLayoutRoute  errorComponent={RouteErrorFallback}
                                             └── paintingModeRoute
```

**Error propagation paths:**
1. Component throws during render → TanStack Router catches at nearest `errorComponent` route boundary → `RouteErrorFallback` renders
2. Async/event handler throws → `window.onerror` / `window.onunhandledrejection` → `console.error` with structured context
3. React Query query/mutation fails after retries exhausted → `QueryCache.onError` / `MutationCache.onError` → `console.error` with query key

### Recommended Project Structure

```
src/
  components/
    common/
      RouteErrorFallback.tsx     # Shared error fallback for layout routes
      DbHealthGate.tsx           # Startup DB health check wrapper
      DbDiagnosticScreen.tsx     # Fallback UI shown when DB fails at startup
      QueryProvider.tsx          # (existing — add QueryCache/MutationCache)
  main.tsx                       # (existing — add window handlers + DbHealthGate)
  app/
    router.tsx                   # (existing — add errorComponent to layout routes)
```

### Pattern 1: TanStack Router `errorComponent` on Layout Routes

**What:** Pass a component to `errorComponent` on `layoutRoute` and `bareLayoutRoute`. TanStack Router wraps each route match in a `CatchBoundary` React error boundary; the `errorComponent` renders when any child throws.

**When to use:** Any `createRoute()` definition supports `errorComponent`. Placing it on the layout route parent means all child routes share the boundary without individual wiring.

**ErrorComponentProps type** (verified from `@tanstack/router-core@1.168.18` installed types):

```typescript
// Source: node_modules/.pnpm/@tanstack+router-core@1.168.18/.../route.d.ts
export type ErrorComponentProps<TError = Error> = {
  error: TError;
  info?: {
    componentStack: string;
  };
  reset: () => void;
};
```

**Usage:**

```typescript
// Source: TanStack Router v1 docs (verified from installed types)
import { createRoute, type ErrorComponentProps } from "@tanstack/react-router";

function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <Card>
      <CardContent>
        <AlertTriangle />
        <h2>Something went wrong</h2>
        {import.meta.env.DEV && <pre>{error.message}</pre>}
        <Button onClick={reset}>Reload Page</Button>
        <Link to="/">Go to Dashboard</Link>
      </CardContent>
    </Card>
  );
}

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  errorComponent: RouteErrorFallback,   // ← add this
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});
```

**Note on `reset()`:** The `reset` function clears the error boundary's internal state and retries rendering. For errors that originated from route loaders (not component renders), prefer `router.invalidate()` which coordinates both router reload and boundary reset. For component render crashes, `reset()` is sufficient.

**Note on isolation:** TanStack Router wraps each route match individually via its `Match` component. A crash on a child route of `layoutRoute` (e.g., `/army-lists`) triggers `layoutRoute`'s `errorComponent` — the rest of the router (bare layout, other potential root-level routes) is unaffected.

### Pattern 2: DB Startup Health Gate

**What:** A React component that runs a DB health check with `useEffect` on mount, renders a loading state while checking, renders a diagnostic screen on failure, and renders children on success.

**Health check query selection** (Claude's Discretion resolved):

- `SELECT 1` — pure connectivity probe; confirms the DB file exists and is readable
- `PRAGMA user_version` — returns the migration version (32 after all 32 hobbyforge.db migrations applied); confirms schema is up-to-date

This combination (already used in `diagnostics.ts` for `getSchemaVersions()`) is the right tradeoff: instant, zero overhead, covers both "DB file missing/corrupt" and "migration not applied" failure modes.

`PRAGMA integrity_check` was evaluated and rejected: O(N log N), can take minutes on larger databases per SQLite documentation. Inappropriate for every startup.

The expected `user_version` value is **32** — there are 32 migration files (`001` through `032`) in `src-tauri/migrations/`. This is set automatically by Tauri's plugin-sql migration runner.

```typescript
// src/components/common/DbHealthGate.tsx
// Source: Pattern derived from existing diagnostics.ts + client.ts patterns [CITED: project codebase]

type HealthState = "checking" | "ok" | "failed";

export function DbHealthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>("checking");
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setState("checking");
    try {
      const db = await getDb();
      await db.select("SELECT 1");
      const versionRows = await db.select<{ user_version: number }[]>(
        "PRAGMA user_version"
      );
      const version = versionRows[0]?.user_version ?? 0;
      if (version < 32) {
        throw new Error(
          `Schema version mismatch: expected 32, got ${version}. ` +
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

  if (state === "checking") return <LoadingScreen />;
  if (state === "failed") return <DbDiagnosticScreen error={error} onRetry={runCheck} />;
  return <>{children}</>;
}
```

**Important:** `DbHealthGate` wraps `QueryProvider > RouterProvider` in `main.tsx` — it sits outside React Query, so it cannot use `useQuery`. The `useState`/`useEffect` pattern (D-05) is correct here.

### Pattern 3: React Query Global Error Capture

**What:** Pass `QueryCache` and `MutationCache` instances with `onError` callbacks to `QueryClient`. These fire for every error regardless of per-hook `onError` overrides.

**Verified API** (from `@tanstack/query-core@5.100.6` installed types):

```typescript
// QueryCacheConfig.onError signature:
onError?: (error: DefaultError, query: Query<unknown, unknown, unknown>) => void;

// MutationCacheConfig.onError signature:
onError?: (
  error: DefaultError,
  variables: unknown,
  onMutateResult: unknown,
  mutation: Mutation<unknown, unknown, unknown>,
  context: MutationFunctionContext
) => Promise<unknown> | unknown;
```

**Usage in `QueryProvider.tsx`:**

```typescript
// Source: @tanstack/query-core@5.100.6 types + React Query v5 docs pattern [VERIFIED: npm registry]
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";

new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("[ReactQuery] Query failed:", {
        queryKey: query.queryKey,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error("[ReactQuery] Mutation failed:", {
        mutationKey: mutation.options.mutationKey,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  }),
  defaultOptions: {
    queries: { staleTime: ..., gcTime: ..., refetchOnWindowFocus: false, retry: 1 },
  },
})
```

**Why not `defaultOptions.queries.onError`:** This callback was removed from React Query v5. `QueryCache` / `MutationCache` callbacks are the v5-idiomatic approach and cannot be silently bypassed by per-hook overrides. [CITED: medium.com/@valerasheligan + query-core v5 types]

### Pattern 4: Window Global Error Handlers

**What:** Register `window.onerror` and `window.onunhandledrejection` before `ReactDOM.createRoot()` in `main.tsx`.

**When to use:** These catch errors that escape React's render cycle — errors in event handlers, async code not awaited within React, and third-party library errors.

```typescript
// Registered before ReactDOM.createRoot() in main.tsx
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[GlobalError]", {
    timestamp: new Date().toISOString(),
    message,
    source,
    location: `${lineno}:${colno}`,
    stack: error?.stack,
  });
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error("[UnhandledRejection]", {
    timestamp: new Date().toISOString(),
    reason: event.reason,
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
};
```

### Anti-Patterns to Avoid

- **Using `PRAGMA integrity_check` at startup:** O(N log N), can take 30+ seconds on larger DBs. Use `SELECT 1` + `PRAGMA user_version` instead.
- **Using `defaultOptions.queries.onError` in React Query v5:** This pattern was removed in v5. Per-hook `onError` in `useQuery` also no longer exists as of v5 — use `QueryCache`/`MutationCache`.
- **Hardcoding version = 32:** The expected version should be derived from a constant or comment that tracks migration count. Add a `EXPECTED_SCHEMA_VERSION = 32` constant in the health gate file so future migrations prompt a code update.
- **Relying solely on `reset()` for loader errors:** When an error originated in `beforeLoad` or `loader`, call `router.invalidate()` instead of `reset()` to coordinate both router reload and boundary reset.
- **Placing `DbHealthGate` inside `QueryProvider`:** The health gate must wrap `QueryProvider` so it renders before any React Query hook fires. Wrong order causes health check failures to surface as cryptic React Query errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React render error catching | Custom class `ErrorBoundary` wrapping every route | TanStack Router `errorComponent` on layout routes | Router already wraps route matches in `CatchBoundary`; adding a redundant outer class component is wasted code |
| Error boundary reset on navigation | Manual boundary key/ref tracking | TanStack Router's built-in reset key mechanism | Router resets error boundaries automatically when the route key changes on navigation |
| Per-query error toasts | Toast in every `onError` of every `useQuery` | `QueryCache.onError` global handler | One place, consistent format, no duplication across 40+ hooks |

**Key insight:** TanStack Router's `CatchBoundary` is already a class-component error boundary internally — `errorComponent` is just the render prop for its fallback. No manual class component is needed for this phase.

---

## Common Pitfalls

### Pitfall 1: Error Boundary Does Not Catch Async Errors
**What goes wrong:** A component calls `someAsyncFunction()` without await inside a `useEffect`, or an event handler throws — neither is caught by the route `errorComponent`.
**Why it happens:** React error boundaries only catch errors thrown synchronously during render, not async errors.
**How to avoid:** The `window.onerror` / `window.onunhandledrejection` handlers (D-08) cover the async path. Both mechanisms together provide full coverage.
**Warning signs:** An error that appears in the console but does not trigger the fallback UI.

### Pitfall 2: `reset()` Does Not Clear Loader State
**What goes wrong:** User clicks "Reload Page" on the fallback, `reset()` is called, the error boundary clears, but the route re-mounts and immediately throws again because the root cause is a bad URL parameter.
**Why it happens:** `reset()` only resets React's error boundary state, not TanStack Router's navigation/loader state.
**How to avoid:** For ERR-01 (render errors during component render), `reset()` is correct. The "Go to Dashboard" link is the more reliable recovery path for most users.
**Warning signs:** Cyclical error → reset → immediate re-error loop.

### Pitfall 3: `PRAGMA user_version` Column Name Varies
**What goes wrong:** `db.select<{ user_version: number }[]>("PRAGMA user_version")` returns `{}` (empty object) or a row without the `user_version` key.
**Why it happens:** Tauri's plugin-sql wraps SQLite PRAGMA results, and the column name returned by driver may vary. This is already documented in the project's own `diagnostics.ts` (see `extractVersion` fallback).
**How to avoid:** Use the same `extractVersion` pattern from `diagnostics.ts` — check for `row.user_version` first, fall back to `Object.values(row)[0]`.
**Warning signs:** `version` evaluates to `0` even after migrations run.

### Pitfall 4: DbHealthGate Renders Twice in StrictMode
**What goes wrong:** In development with `React.StrictMode`, `useEffect` fires twice, causing two DB health check calls.
**Why it happens:** React 18/19 StrictMode mounts → unmounts → remounts every component to detect side effects.
**How to avoid:** The `getDb()` singleton returns the same promise on the second call — no duplicate connection is created. The double-fire is harmless but worth knowing. Do not add `useRef` guards that break the Retry button.
**Warning signs:** Console shows two "[DB Health Check]" log messages in dev; this is expected.

### Pitfall 5: QueryCache/MutationCache Fires for Retries (Not Just Final Failure)
**What goes wrong:** With `retry: 1`, React Query calls `onError` after the single retry attempt, not during it. However, logging may appear twice if query is refetched and fails again.
**Why it happens:** `QueryCache.onError` fires every time a query settles in error state, including after re-fetches.
**How to avoid:** Accept this behavior — console-only logging is the goal (D-09), not deduplication. Add context like `queryKey` so repeated logs are identifiable.
**Warning signs:** Duplicate log lines for the same query after navigation — normal behavior.

---

## Code Examples

### Complete `RouteErrorFallback` component

```typescript
// Source: ErrorComponentProps from @tanstack/router-core@1.168.18 [VERIFIED: npm registry]
// File: src/components/common/RouteErrorFallback.tsx

import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

### Updated `router.tsx` layout routes

```typescript
// Source: TanStack Router createRoute pattern [CITED: deepwiki.com/TanStack/router/4.6-error-handling]
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  errorComponent: RouteErrorFallback,   // ← ERR-01 + ERR-02
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});

const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "bare-layout",
  errorComponent: RouteErrorFallback,   // ← ERR-02 isolation for painting mode
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

### Updated `main.tsx`

```typescript
// Source: window error handler patterns + DbHealthGate pattern [ASSUMED]
import { DbHealthGate } from "@/components/common/DbHealthGate";

// Register BEFORE ReactDOM.createRoot (D-08 / ERR-04)
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

### Updated `QueryProvider.tsx`

```typescript
// Source: @tanstack/query-core@5.100.6 installed types + v5 QueryCache pattern
// [VERIFIED: npm registry — QueryCacheConfig.onError confirmed in installed types]
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";

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

## DB Health Check: `SELECT 1` vs `PRAGMA integrity_check`

**Decision (Claude's Discretion D-03):** Use `SELECT 1` + `PRAGMA user_version`.

| Check | Performance | Detects |
|-------|-------------|---------|
| `SELECT 1` | ~1ms | DB file exists, is readable, driver loaded |
| `PRAGMA user_version` | ~1ms | All migrations have run (value = 32) |
| `PRAGMA quick_check` | O(N) | Structural corruption (btree, cell offsets) |
| `PRAGMA integrity_check` | O(N log N) | Full structural + key ordering check |

`PRAGMA integrity_check` takes 6+ minutes for 180MB DBs, 30+ minutes on low-power hardware [CITED: sqlite.org/forum + sqlite-users mailing list]. The existing project diagnostics page already uses `PRAGMA user_version` for schema version reporting — the health gate reuses this established pattern.

**Expected version:** `32` — there are exactly 32 hobbyforge.db migration files (`001_core_schema.sql` through `032_army_list_snapshots.sql`). This constant should be named `EXPECTED_SCHEMA_VERSION` in `DbHealthGate.tsx`.

---

## React 19 Error Boundary: Class vs Functional

**Decision (Claude's Discretion):** Use functional components for the error fallback UI, relying on TanStack Router's built-in `CatchBoundary` class component internally.

React 19 still requires class components for custom error boundaries. However, TanStack Router's `errorComponent` prop does NOT require writing a class component — TanStack Router's internal `CatchBoundary` is the class component; `errorComponent` is just its fallback render function (functional component receiving `ErrorComponentProps`). [VERIFIED: installed router-core types]

If manual class-component error boundaries are needed outside TanStack Router (they are not needed for this phase), the standard pattern is:

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State { ... }
  componentDidCatch(error: Error, info: React.ErrorInfo) { ... }
}
```

The `react-error-boundary` package is not installed and not needed for this phase.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `defaultOptions.queries.onError` | `QueryCache({ onError })` / `MutationCache({ onError })` | React Query v5 (late 2023) | `defaultOptions.onError` removed; v5 requires cache-level handlers for global capture |
| `window.addEventListener('error', ...)` | `window.onerror = ...` assignment | Stable | Both work; assignment is simpler for single handler |
| Custom class `ErrorBoundary` with `react-error-boundary` | TanStack Router `errorComponent` prop | TanStack Router v1 | No class component needed for route-level boundaries |

**Deprecated/outdated:**
- `useQuery({ onError: () => {} })`: Removed in React Query v5. Compile error in v5 if used.
- `defaultOptions.queries.onError`: Also removed from defaultOptions in v5.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `window.onerror` assignment (not `addEventListener`) is the correct pattern | Pattern 4 | Both approaches work; using `addEventListener('error', ...)` would also satisfy ERR-04 with no behavioral difference |
| A2 | `EXPECTED_SCHEMA_VERSION = 32` based on 32 migration files | DB Health Check | If a new migration is added during this phase or migrations are reordered, the constant needs updating |

**All critical claims (ErrorComponentProps type, QueryCache API, MutationCache API) were verified against installed package types.**

---

## Open Questions

1. **Schema version constant maintenance**
   - What we know: There are 32 migration files; the expected `user_version` is 32
   - What's unclear: Should the constant be derived programmatically (e.g., injected by Vite from migration file count) or hardcoded with a comment?
   - Recommendation: Hardcode as `const EXPECTED_SCHEMA_VERSION = 32` with a comment pointing to the migrations directory. Hardcoding is simpler and the value rarely changes mid-phase.

2. **LoadingScreen during DB health check**
   - What we know: The health check is ~2ms; a loading state will flash briefly
   - What's unclear: Should there be a visible loading spinner or just a blank/themed screen?
   - Recommendation: Return `null` or a minimal styled div (app background color) during the "checking" state — the check completes before the next paint frame in normal operation. Only show content on "failed".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tanstack/react-router` | Error boundaries (ERR-01/02) | Yes | 1.168.26 | — |
| `@tanstack/react-query` | Global error capture (ERR-04) | Yes | 5.100.6 | — |
| shadcn/ui Card, Button | Fallback UI (D-06) | Yes | project-managed | — |
| `lucide-react` | Error icon | Yes | 0.460.0 | — |
| Vitest + RTL | Tests | Yes | 4.1.5 / 16.3.2 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/error-resilience/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ERR-01 | `RouteErrorFallback` renders Card + "Something went wrong" when component throws | unit | `pnpm test -- tests/error-resilience/RouteErrorFallback.test.tsx` | Wave 0 |
| ERR-01 | Error message shown in DEV, hidden in PROD | unit | same file | Wave 0 |
| ERR-01 | "Reload Page" button calls `reset()` | unit | same file | Wave 0 |
| ERR-02 | `layoutRoute` has `errorComponent` set to `RouteErrorFallback` | unit | `pnpm test -- tests/error-resilience/routerErrorComponents.test.ts` | Wave 0 |
| ERR-02 | `bareLayoutRoute` has `errorComponent` set to `RouteErrorFallback` | unit | same file | Wave 0 |
| ERR-03 | `DbHealthGate` renders `DbDiagnosticScreen` when `getDb` throws | unit | `pnpm test -- tests/error-resilience/DbHealthGate.test.tsx` | Wave 0 |
| ERR-03 | `DbHealthGate` renders `DbDiagnosticScreen` when `user_version < 32` | unit | same file | Wave 0 |
| ERR-03 | `DbHealthGate` renders children when health check passes | unit | same file | Wave 0 |
| ERR-03 | Retry button re-runs health check | unit | same file | Wave 0 |
| ERR-04 | `QueryProvider` creates `QueryClient` with `QueryCache.onError` | unit | `pnpm test -- tests/error-resilience/QueryProviderGlobalError.test.tsx` | Wave 0 |
| ERR-04 | `QueryProvider` creates `QueryClient` with `MutationCache.onError` | unit | same file | Wave 0 |
| ERR-04 | `window.onerror` and `window.onunhandledrejection` are registered | unit | `pnpm test -- tests/error-resilience/globalErrorHandlers.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/error-resilience/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/error-resilience/RouteErrorFallback.test.tsx` — covers ERR-01
- [ ] `tests/error-resilience/routerErrorComponents.test.ts` — covers ERR-02
- [ ] `tests/error-resilience/DbHealthGate.test.tsx` — covers ERR-03
- [ ] `tests/error-resilience/QueryProviderGlobalError.test.tsx` — covers ERR-04 (query/mutation cache)
- [ ] `tests/error-resilience/globalErrorHandlers.test.ts` — covers ERR-04 (window handlers)

**Test implementation notes:**
- Mock `getDb` (and its `select` method) in `DbHealthGate` tests via `vi.mock("@/db/client")`
- Mock `import.meta.env.DEV` for error message visibility tests using Vitest's `vi.stubEnv`
- For `routerErrorComponents.test.ts`, import `layoutRoute` and `bareLayoutRoute` from `router.tsx` and assert `errorComponent` is defined — no rendering needed
- `window.onerror` handler test: call `window.onerror(...)` directly and assert `console.error` was called with structured context via `vi.spyOn(console, 'error')`

---

## Security Domain

This phase adds no authentication, session management, or data exposure. The error fallback deliberately hides raw error messages in production (D-07), which is the primary security consideration: stack traces and file paths must not be exposed to end users in production builds.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | No | No user input in error boundary |
| V6 Cryptography | No | No cryptographic operations |
| Error message disclosure | Yes | `import.meta.env.DEV` guard on error details (D-07) |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/.pnpm/@tanstack+router-core@1.168.18/.../route.d.ts` — `ErrorComponentProps` type definition (verified: `{ error: TError; info?: { componentStack: string }; reset: () => void }`)
- `node_modules/.pnpm/@tanstack+query-core@5.100.6/.../`_tsup-dts-rollup.d.ts` — `QueryCacheConfig.onError` and `MutationCacheConfig.onError` signatures (verified from installed types)
- `src/db/queries/diagnostics.ts` — project's own `PRAGMA user_version` pattern + `extractVersion` fallback
- `src-tauri/migrations/` — 32 migration files (001-032); expected `user_version = 32`
- `react.dev/reference/react/Component` — Error boundaries require class components in React 19; functional `errorComponent` works via TanStack Router's internal `CatchBoundary`

### Secondary (MEDIUM confidence)
- [deepwiki.com/TanStack/router/4.6-error-handling](https://deepwiki.com/TanStack/router/4.6-error-handling) — `errorComponent` prop behavior, `reset()` vs `router.invalidate()`, per-route isolation via `Match` component
- [TanStack Start error boundaries docs](https://tanstack.com/start/latest/docs/framework/react/guide/error-boundaries) — `ErrorComponentProps`, `defaultErrorComponent` on `createRouter`, per-route override pattern
- [medium.com/@valerasheligan — React Query v5 global errors](https://medium.com/@valerasheligan/how-to-handle-global-errors-in-react-query-v5-4f8b919ee47a) — `QueryCache`/`MutationCache` `onError` approach confirmed as v5 standard

### Tertiary (LOW confidence)
- [sqlite.org forum — integrity_check performance](https://sqlite.org/forum/info/631e8968e70b35bc) — benchmark data on `PRAGMA integrity_check` duration (cited for pitfall documentation only)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules; no new installs
- Architecture: HIGH — `ErrorComponentProps` type verified from installed types; `QueryCache` API verified from installed types
- Pitfalls: HIGH — cross-referenced against React Query v5 changelog, router docs, and existing project code
- DB health check recommendation: HIGH — supported by SQLite official documentation + existing project diagnostics patterns

**Research date:** 2026-05-22
**Valid until:** 2026-08-22 (stable APIs; TanStack Router and React Query have no announced breaking changes in this area)
