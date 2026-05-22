# Phase 97: Error Resilience - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the app gracefully handle any runtime error without losing the user's context or showing a blank screen. It adds error boundaries, a startup DB health check gate, and global error capture. No new user-facing features — purely defensive infrastructure.

Requirements: ERR-01 (fallback UI), ERR-02 (per-route isolation), ERR-03 (DB health gate), ERR-04 (unhandled error capture).

</domain>

<decisions>
## Implementation Decisions

### Error Boundary Granularity
- **D-01:** Place error boundaries at the layout route level — one on `layoutRoute` (standard app shell) and one on `bareLayoutRoute` (painting mode). This gives per-section isolation: a crash on `/army-lists` doesn't affect `/collection`, and painting mode crashes don't break the main app.
- **D-02:** Use TanStack Router's built-in `errorComponent` prop on the two layout routes. This avoids manually wrapping every route and integrates naturally with the existing router architecture.

### DB Health Check Behavior
- **D-03:** On startup, run a lightweight health check (`SELECT 1` + verify schema version from migrations) before rendering the main router. If it fails, render a dedicated diagnostic component instead of the normal app.
- **D-04:** The diagnostic screen shows the error message, a "Retry" button (re-runs the health check), and basic troubleshooting guidance. No auto-repair — just inform the user.
- **D-05:** Implement as a wrapper component in `main.tsx` that gates `RouterProvider` behind the health check. Uses a simple `useState`/`useEffect` pattern — no need for Suspense or React Query for this one-time check.

### Fallback UI Design
- **D-06:** Error fallback is a styled Card (shadcn/ui) matching the app theme with: error icon, "Something went wrong" heading, error message (dev only), "Reload Page" button, and "Go to Dashboard" link for navigation recovery.
- **D-07:** In production builds, hide the raw error message/stack. In dev mode, show full error details for debugging.

### Global Error Capture
- **D-08:** Register `window.onerror` and `window.onunhandledrejection` handlers in `main.tsx` that log structured context to `console.error` — timestamp, error type, message, stack, and component context where available.
- **D-09:** Add a global `onError` handler to the React Query `QueryClient` defaults (in `QueryProvider.tsx`) so failed queries/mutations are logged with their query key for easier debugging. This captures errors that React Query retries and exhausts silently.

### Claude's Discretion
- Error boundary component file location and naming
- Exact health check query (SELECT 1 vs PRAGMA integrity_check — researcher should evaluate tradeoffs)
- Whether to use a React class component or functional approach for error boundaries (React 19 may have options)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/REQUIREMENTS.md` — ERR-01 through ERR-04 requirements definitions
- `.planning/ROADMAP.md` §Phase 97 — Success criteria (4 items)

### Existing Error Handling
- `src/db/client.ts` — Current DB singleton with catch-and-reset pattern (health check wraps this)
- `src/db/rules-client.ts` — Rules DB connection (WAL mode + busy_timeout pattern to match)
- `src/components/common/QueryProvider.tsx` — React Query defaults where global onError hooks go
- `src/main.tsx` — App entry point where DB gate and global handlers are registered
- `src/app/router.tsx` — Route tree with layoutRoute and bareLayoutRoute (error boundary targets)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx` (shadcn Card) — use for styled error fallback UI
- `src/components/ui/button.tsx` (shadcn Button) — "Reload" and "Go Home" actions
- `src/components/ui/alert.tsx` (shadcn Alert) — potential for diagnostic screen warnings

### Established Patterns
- TanStack Router `errorComponent` prop — supported on all route definitions, renders on unhandled throws during render
- React Query `retry: 1` — already limits retries; global `onError` complements this
- DB singleton pattern in `client.ts` — catch resets `_dbPromise` to null, allowing retry on next call

### Integration Points
- `main.tsx` — DB health gate wraps `QueryProvider` > `RouterProvider`
- `router.tsx` layoutRoute and bareLayoutRoute — `errorComponent` prop for error boundaries
- `QueryProvider.tsx` — `queryClient` default options for global `onError`
- `window` event listeners — registered once in `main.tsx` before React render

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. This is a pure infrastructure phase following well-established React error handling patterns.

</specifics>

<deferred>
## Deferred Ideas

- **FUT-04 (persistent error logging):** Component-level error logging to persistent storage (not just console) — listed in REQUIREMENTS.md as v0.3.1+ future requirement
- **Error reporting service:** No external error reporting needed for a local desktop app; console logging is sufficient

None — discussion stayed within phase scope

</deferred>

---

*Phase: 97-Error Resilience*
*Context gathered: 2026-05-22*
