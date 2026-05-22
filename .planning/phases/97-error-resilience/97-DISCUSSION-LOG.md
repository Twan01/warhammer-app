# Phase 97: Error Resilience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 97-error-resilience
**Areas discussed:** Error boundary granularity, DB health check behavior, Fallback UI design, Global error capture strategy
**Mode:** --auto (fully autonomous)

---

## Error Boundary Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per-layout boundary | 2 boundaries on layoutRoute + bareLayoutRoute via TanStack Router errorComponent | [auto] ✓ |
| Per-route boundary | Individual errorComponent on each of the 16 routes | |
| Single app-level boundary | One boundary wrapping the entire RouterProvider | |

**Selection:** Per-layout boundary (recommended default)
**Rationale:** TanStack Router natively supports errorComponent. Two layout routes (standard + bare/painting-mode) give meaningful isolation without 16 individual boundaries. A crash on one route doesn't blank the entire app.

---

## DB Health Check Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Diagnostic screen with retry | Show error + "Retry" button, block app render until healthy | [auto] ✓ |
| Silent fallback with banner | Let app render but show persistent warning banner | |
| Auto-repair attempt | Try PRAGMA integrity_check and auto-fix before showing error | |

**Selection:** Diagnostic screen with retry (recommended default)
**Rationale:** A corrupted or inaccessible DB means the app can't function. Better to gate rendering entirely and give the user clear feedback than render an empty shell.

---

## Fallback UI Design

| Option | Description | Selected |
|--------|-------------|----------|
| Styled card with actions | shadcn Card with error icon, message, Reload + Go Home buttons | [auto] ✓ |
| Minimal text fallback | Plain text "Something went wrong" with reload link | |
| Full diagnostic panel | Expandable error details with stack trace and system info | |

**Selection:** Styled card with actions (recommended default)
**Rationale:** Consistent with existing shadcn/ui component library. Dev mode shows details, production hides them.

---

## Global Error Capture Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Console logging with structured context | window.onerror + onunhandledrejection + React Query onError, all to console.error | [auto] ✓ |
| Toast notifications for user-visible errors | Show toast on unhandled errors in addition to logging | |
| Persistent error log file | Write errors to a local file via Tauri FS | |

**Selection:** Console logging with structured context (recommended default)
**Rationale:** Desktop app needs no external service. Structured console output is sufficient for debugging. Persistent file logging is FUT-04 (future requirement).

---

## Claude's Discretion

- Error boundary component file location and naming
- Exact health check query details
- React class vs functional component approach for error boundaries

## Deferred Ideas

- FUT-04: Persistent error logging to file (v0.3.1+)
- External error reporting service (not needed for desktop app)
