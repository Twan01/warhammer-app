---
phase: 97-error-resilience
plan: "02"
subsystem: error-resilience
tags: [db-health-gate, global-error-capture, react-query-cache, startup-validation]
dependency_graph:
  requires: []
  provides: [DbHealthGate, DbDiagnosticScreen, globalErrorHandlers, QueryCache-onError, MutationCache-onError]
  affects: [src/main.tsx, src/components/common/QueryProvider.tsx]
tech_stack:
  added: [shadcn-alert]
  patterns: [startup-health-gate, extracted-error-handlers, query-cache-error-logging]
key_files:
  created:
    - src/components/common/DbHealthGate.tsx
    - src/components/common/DbDiagnosticScreen.tsx
    - src/lib/globalErrorHandlers.ts
    - src/components/ui/alert.tsx
    - tests/error-resilience/DbHealthGate.test.tsx
    - tests/error-resilience/QueryProviderGlobalError.test.tsx
    - tests/error-resilience/globalErrorHandlers.test.ts
  modified:
    - src/main.tsx
    - src/components/common/QueryProvider.tsx
    - tests/error-resilience/RouteErrorFallback.test.tsx
decisions:
  - "EXPECTED_SCHEMA_VERSION set to 33 (matching 033_database_hardening.sql), correcting plan's stale value of 32"
  - "Extracted global error handlers to src/lib/globalErrorHandlers.ts for testability (importing main.tsx triggers ReactDOM.createRoot side effect)"
metrics:
  duration: "15m 33s"
  completed: "2026-05-22T10:19:12Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 11
  files_created: 7
  files_modified: 3
---

# Phase 97 Plan 02: DB Health Gate & Global Error Capture Summary

Startup DB health gate blocks rendering until database passes SELECT 1 + PRAGMA user_version check; global error handlers capture uncaught exceptions, promise rejections, and React Query failures to console.error with structured context.

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create DbHealthGate, DbDiagnosticScreen, wire main.tsx and QueryProvider.tsx | 58a0b02 | DbHealthGate.tsx, DbDiagnosticScreen.tsx, main.tsx, QueryProvider.tsx |
| 2 | Add unit tests for DbHealthGate, global error handlers, and QueryProvider error capture | 5c34dc5 | DbHealthGate.test.tsx, QueryProviderGlobalError.test.tsx, globalErrorHandlers.test.ts |

## What Was Built

### DbHealthGate (ERR-03 / D-03, D-05)
- Startup wrapper component using useState/useEffect pattern (no React Query dependency)
- Runs SELECT 1 + PRAGMA user_version before allowing app to render
- Three states: checking (null render), failed (DbDiagnosticScreen), ok (children)
- EXPECTED_SCHEMA_VERSION = 33 (matches migration 033_database_hardening.sql)
- extractVersion helper copied from diagnostics.ts for driver column-name variance

### DbDiagnosticScreen (D-04)
- Card-based diagnostic UI with Database icon, destructive Alert showing error message
- Troubleshooting guidance text and Retry Connection button
- No auto-repair per design decision

### Global Error Handlers (ERR-04 / D-08)
- handleGlobalError: logs structured context (timestamp, type, message, source, location, stack) via console.error("[GlobalError]")
- handleUnhandledRejection: logs structured context (timestamp, type, reason, stack) via console.error("[UnhandledRejection]")
- Handlers extracted to src/lib/globalErrorHandlers.ts for testability
- Registered via window.onerror and window.onunhandledrejection in main.tsx before createRoot

### QueryProvider Error Capture (D-09)
- QueryCache with onError logging failed queries with queryKey
- MutationCache with onError logging failed mutations with mutationKey
- Both log structured context with timestamp to console.error
- All existing defaultOptions (staleTime, gcTime, refetchOnWindowFocus, retry) preserved

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EXPECTED_SCHEMA_VERSION corrected from 32 to 33**
- **Found during:** Task 1
- **Issue:** Plan specified 32 migration files, but actual count is 33 (033_database_hardening.sql is the latest)
- **Fix:** Set EXPECTED_SCHEMA_VERSION = 33
- **Files modified:** src/components/common/DbHealthGate.tsx

**2. [Rule 3 - Blocking] Missing shadcn alert component**
- **Found during:** Task 1
- **Issue:** DbDiagnosticScreen imports Alert from @/components/ui/alert which did not exist
- **Fix:** Added shadcn alert component via `npx shadcn@latest add alert`
- **Files modified:** src/components/ui/alert.tsx (created)

**3. [Rule 3 - Blocking] Global error handlers extracted to separate module**
- **Found during:** Task 2
- **Issue:** Importing main.tsx in tests triggers ReactDOM.createRoot side effect (no DOM element in test environment)
- **Fix:** Extracted handleGlobalError and handleUnhandledRejection to src/lib/globalErrorHandlers.ts; main.tsx imports and registers them
- **Files modified:** src/lib/globalErrorHandlers.ts (created), src/main.tsx (updated imports)

**4. [Rule 1 - Bug] Pre-existing type error in RouteErrorFallback test**
- **Found during:** Task 1
- **Issue:** vi.stubEnv("DEV", "") passes string where boolean expected (TypeScript strict mode)
- **Fix:** Changed to vi.stubEnv("DEV", false)
- **Files modified:** tests/error-resilience/RouteErrorFallback.test.tsx

## Test Results

All 11 new tests pass (18 total in error-resilience directory):
- DbHealthGate: 5 tests (pass, getDb throw, version mismatch, retry, version constant)
- QueryProvider global error: 2 tests (QueryCache onError, MutationCache onError)
- Global error handlers: 4 tests (onerror structured, onerror missing params, rejection Error, rejection non-Error)

## Known Stubs

None - all components are fully wired with real data sources.

## Self-Check: PASSED
