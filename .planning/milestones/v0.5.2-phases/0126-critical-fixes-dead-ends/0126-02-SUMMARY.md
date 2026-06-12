---
phase: 126-critical-fixes-dead-ends
plan: 02
subsystem: ui/css
tags: [css-tokens, scrollbar, page-headers, light-mode, consistency]
dependency_graph:
  requires: []
  provides: [light-mode-token-fallbacks, dark-scrollbar-styling, consistent-page-headers]
  affects: [src/styles/globals.css, src/app/settings/page.tsx, src/features/data-health/DataHealthPage.tsx]
tech_stack:
  added: []
  patterns: [css-custom-properties, shared-component-reuse]
key_files:
  created: []
  modified:
    - src/styles/globals.css
    - src/app/settings/page.tsx
    - src/features/data-health/DataHealthPage.tsx
decisions:
  - "Light-mode --battle-gold uses oklch(0.55 0.17 85) for white-background readability"
  - "Scrollbar thumb uses border-radius 9999px for rounded appearance"
metrics:
  duration: "2 minutes"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 126 Plan 02: CSS Tokens, Scrollbar & PageHeaders Summary

Light-mode fallbacks for 4 dark-only tokens, custom dark scrollbar (6px zinc-themed rounded), and PageHeader adoption on Settings and Data Health pages.

## What Was Done

### Task 1: Light-mode token fallbacks and scrollbar styling (9d7a8370)

Added `:root` fallbacks for `--forge-black`, `--panel-elevated`, `--panel-surface`, and `--battle-gold` so these tokens never resolve to undefined in light mode. Added dark-mode custom scrollbar rules: 6px thin scrollbar with zinc-900 track, zinc-700 thumb (rounded-full), zinc-600 hover state, plus Firefox `scrollbar-width: thin` fallback.

**Files modified:** `src/styles/globals.css`

### Task 2: Replace inline headers with PageHeader (1a7a80a5)

Replaced custom `<h1 className="text-xl font-semibold">` in Settings and Data Health pages with the shared `<PageHeader>` component, which renders text-3xl font-semibold tracking-tight with border-b border-border/40. Both pages now match all other main pages visually.

**Files modified:** `src/app/settings/page.tsx`, `src/features/data-health/DataHealthPage.tsx`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm build` passes after both tasks
- `:root` block contains all 4 token definitions
- `.dark ::-webkit-scrollbar` rules present with correct values
- No remaining `<h1` elements in Settings or Data Health pages
- Both files import and render `<PageHeader>`

## Self-Check: PASSED
