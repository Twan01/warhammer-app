---
phase: 143-apply-flow-slot-fill-system
audited: 2026-06-22
baseline: 143-UI-SPEC.md
overall_score: 19
max_score: 24
status: advisory
screenshots: none (code-only audit — no dev server)
---

# Phase 143 — UI Review (Advisory)

**Overall: 19/24** — non-blocking. All six pillars score 3–4/4.

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Badge hover tooltip copy missing; EditColoursDialog CTA/description not in spec copy table (reasonable inference) |
| 2. Visuals | 3/4 | Locked-step opacity is `opacity-80` in detail view vs spec's `opacity-60` (intentional Plan 04 choice); badge tooltip not surfaced for sighted users |
| 3. Color | 3/4 | `text-primary` on `RecipeDetailSheet.tsx:330` — confirm it is the "Edit colours" affordance, else replace with non-accent token |
| 4. Typography | 4/4 | Full spec match — only `text-xs`/`text-sm`/`text-[10px]`; weights `font-medium`/`font-semibold` |
| 5. Spacing | 3/4 | All multiples of 4; `px-2 py-1` preview rows + `py-8`/`py-4` empty states not named scale tokens (substantively fine) |
| 6. Experience Design | 3/4 | HTML `title` on a non-interactive `div` is keyboard/SR-inaccessible; no ErrorBoundary around dialogs (pre-existing) |

## Top 3 Fixes (deferred polish — non-blocking)

1. **Badge hover tooltip** — add `title={\`from ${techniqueName} — click to view in library\`}` to the interactive `<button>` in `TechniqueSectionBadge.tsx` (~line 34). `aria-label` is present; sighted mouse/keyboard users currently get no hover hint.
2. **Confirm `text-primary` at `RecipeDetailSheet.tsx:330`** — if it is not the "Edit colours" affordance, replace with `text-foreground`/`text-muted-foreground`. Also reconsider whether the SectionedTimeline "Edit colours" ghost button should be `variant="default"` (accent) per spec.
3. **Accessible locked-step tooltip** — replace the `title` on the `SectionedTimeline.tsx:207` `div` wrapper with a shadcn `Tooltip` on a lock indicator, or `aria-label` on the `RecipeStepTimeline` root when read-only.

## Notes

- Registry audit: only shadcn official blocks (Dialog, Badge, Button, Input, Separator, ScrollArea, Skeleton). No third-party registries. N/A.
- All spec-declared copy strings present and exact (picker, slot-fill, toasts, empty states).
- Loading skeletons, error toasts, disabled-state gating, and aria attributes all present across the three dialogs.

These are advisory polish items; the phase passed verification (5/5 must-haves). Captured here for a future UX polish pass.
