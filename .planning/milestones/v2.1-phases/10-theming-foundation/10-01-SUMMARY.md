---
phase: 10-theming-foundation
plan: "01"
subsystem: theming
tags: [css-custom-properties, react-context, localStorage, tailwind-v4, faction-accent]
dependency_graph:
  requires:
    - "10-00 (Wave 0 test stubs in tests/theming/useActiveFaction.test.ts)"
    - "src/hooks/useFactions.ts (existing)"
    - "src/types/faction.ts (existing Faction interface)"
  provides:
    - "src/styles/globals.css --faction-accent CSS var + --color-faction-accent @theme inline mapping"
    - "src/context/ActiveFactionContext.tsx (ActiveFactionProvider + useActiveFaction hook)"
    - "bg-faction-accent / text-faction-accent / ring-faction-accent / border-faction-accent Tailwind utilities"
  affects:
    - "10-02 (FactionSummaryCard + NavItem consume useActiveFaction and bg-faction-accent)"
    - "10-03 (ActiveFactionProvider wired into router root)"
    - "Phases 11-14 (all themed UI references bg-faction-accent)"
tech_stack:
  added:
    - "src/context/ directory (new — ActiveFactionContext.tsx)"
  patterns:
    - "Synchronous localStorage useState initializer (mirrors useSidebarCollapsed.ts pattern)"
    - "CSS custom property mutation via useEffect setProperty (zero React re-render cost)"
    - "Tailwind v4 @theme inline token for utility generation"
key_files:
  modified:
    - path: "src/styles/globals.css"
      change: "Added --faction-accent: #71717a to :root block; added --color-faction-accent: var(--faction-accent) to @theme inline block"
    - path: "tests/theming/useActiveFaction.test.tsx"
      change: "Renamed from .ts to .tsx (JSX in wrapper requires tsx); replaced 6 it.skip stubs with 6 real passing tests"
  created:
    - path: "src/context/ActiveFactionContext.tsx"
      provides: "ActiveFactionProvider (React context provider) + useActiveFaction hook + ActiveFactionState interface"
decisions:
  - "Renamed test file from .ts to .tsx — JSX syntax in wrapper component requires tsx extension; esbuild rejects JSX in .ts files (Rule 1 auto-fix)"
  - "No useMemo on context value — mirrors useSidebarCollapsed.ts pattern (no memoization there either)"
  - "ActiveFactionContext itself is not exported — only ActiveFactionProvider and useActiveFaction are public API"
  - "Pitfall 2 (one-frame zinc flash on cold start when useFactions query is in-flight) is acceptable per 10-RESEARCH.md"
metrics:
  duration_seconds: 307
  completed_date: "2026-05-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
  tests_added: 6
  tests_baseline: 187
  tests_final: 193
---

# Phase 10 Plan 01: CSS Token + ActiveFactionContext Foundation Summary

JWT-style React context wiring `--faction-accent` CSS var to faction `color_theme` via localStorage-persisted `activeFactionId`, with Tailwind v4 `@theme inline` generating `bg-faction-accent` / `text-faction-accent` / `ring-faction-accent` utilities from the runtime-mutable var.

## What Was Built

### 1. CSS Foundation (src/styles/globals.css)

Two surgical insertions into the existing file — no other lines touched:

- `--faction-accent: #71717a;` inserted into the `:root { }` block (zinc-500 default; runtime-mutable via JS `setProperty`)
- `--color-faction-accent: var(--faction-accent);` inserted into the `@theme inline { }` block (generates all Tailwind faction-accent utilities)

File grew from 106 → 112 lines.

### 2. ActiveFactionContext (src/context/ActiveFactionContext.tsx — new)

New file in new `src/context/` directory. Exports:

- `ActiveFactionState` interface: `{ activeFactionId: number | null, activeFactionHex: string, setActiveFaction: (faction: Faction | null) => void }`
- `ActiveFactionProvider`: React context provider that:
  - Reads `useFactions()` to resolve faction color from stored id
  - Initializes `activeFactionId` synchronously from `localStorage.getItem("active-faction-id")` in `useState` initializer (no cold-start flash)
  - Applies `document.documentElement.style.setProperty("--faction-accent", activeFactionHex)` on every hex change via `useEffect`
  - Persists/removes `active-faction-id` in localStorage via separate `useEffect`
  - Falls back to `"#71717a"` (zinc-500) when no faction selected or data still loading
- `useActiveFaction`: Hook that throws when called outside a provider

Pattern mirrors `useSidebarCollapsed.ts` verbatim (try/catch silent degrade on localStorage).

### 3. Test Suite (tests/theming/useActiveFaction.test.tsx — expanded)

6 Wave-0 stubs replaced with real assertions. File renamed from `.ts` → `.tsx` (see Deviations).

**THEME-01 (DOM mutation):**
- Default zinc hex when localStorage empty
- `setProperty` spy confirms correct hex is set on `setActiveFaction(faction)`
- Zinc restored when `setActiveFaction(null)` called

**THEME-02 (localStorage persistence):**
- Synchronous init from localStorage on mount (no flash)
- `localStorage.setItem` called with correct id string
- `localStorage.removeItem` called on null

## Test Results

```
Test Files  28 passed | 3 skipped (31)
     Tests  193 passed | 12 skipped (205)
```

Previous baseline: 187 passed | 18 skipped. Delta: +6 passing tests, -6 skipped stubs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed test file from .ts to .tsx**
- **Found during:** Task 2 verification (first test run)
- **Issue:** Plan specified `tests/theming/useActiveFaction.test.ts` but the test content contains JSX (`<ActiveFactionProvider>` in wrapper component). esbuild rejects JSX syntax in `.ts` files with "Unterminated regular expression" error.
- **Fix:** `git mv tests/theming/useActiveFaction.test.ts tests/theming/useActiveFaction.test.tsx`
- **Impact:** File rename only — vitest config `include` pattern covers both `.test.ts` and `.test.tsx`; no other files affected
- **Commit:** 998cd41

## Self-Check

- [x] `src/styles/globals.css` exists and contains `--faction-accent: #71717a;` — FOUND
- [x] `src/styles/globals.css` contains `--color-faction-accent: var(--faction-accent);` — FOUND
- [x] `src/styles/globals.css` has single `@theme inline {` block — CONFIRMED (count: 1)
- [x] `src/context/ActiveFactionContext.tsx` exists — FOUND
- [x] Contains `export function ActiveFactionProvider` — FOUND
- [x] Contains `export function useActiveFaction` — FOUND
- [x] Contains `const STORAGE_KEY = "active-faction-id"` — FOUND
- [x] Contains `const DEFAULT_HEX = "#71717a"` — FOUND
- [x] Contains `document.documentElement.style.setProperty("--faction-accent"` — FOUND
- [x] Contains `window.localStorage.getItem(STORAGE_KEY)` — FOUND
- [x] Contains `useFactions()` — FOUND
- [x] Contains `import type { Faction } from "@/types/faction"` — FOUND
- [x] `tests/theming/useActiveFaction.test.tsx` has no `describe.skip` — CONFIRMED
- [x] `tests/theming/useActiveFaction.test.tsx` has no `it.skip` — CONFIRMED
- [x] `pnpm tsc --noEmit` exits 0 — PASSED
- [x] `pnpm test` exits 0, 193 passing — PASSED
- [x] Commits ba5e09a (Task 1) and 998cd41 (Task 2) exist — CONFIRMED

## Self-Check: PASSED
