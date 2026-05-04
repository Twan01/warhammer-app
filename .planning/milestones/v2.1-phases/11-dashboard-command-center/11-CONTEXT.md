# Phase 11: Dashboard Command Center - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the existing Dashboard hero section with two visual enhancements: (1) animated count-up stat counters for the 4 hero cards (UI-07), and (2) verifying the faction-accented active FactionSummaryCard ring from Phase 10 renders correctly (UI-08). No new routes, no new DB tables, no new pages. Pure visual enhancement of the existing DashboardPage.

</domain>

<decisions>
## Implementation Decisions

### Counter Animation Implementation
- Custom `useCountUp(target: number, duration?: number)` hook using `requestAnimationFrame` — no new dependencies
- Ease-out easing: values increase quickly at first then slow to the final number
- Duration: ~600ms (fast — feels snappy, appropriate for a dashboard visited repeatedly)
- Integers only throughout animation — no decimal values mid-count
- Hook lives in `src/hooks/useCountUp.ts`

### Which Stats Animate (UI-07)
- The 4 top hero StatCards all animate: Total Models, Fully Painted, Battle-Ready Points, Active Projects
- The 3 Progress section cards (Painting %, Assembly %, Basing %) do NOT animate — they stay static
- For the percentage suffix cards (if ever added): animate the numeric part, append `%` statically

### Animation Re-trigger Behavior
- Counters animate on every Dashboard mount — TanStack Router unmounts on navigation, so every page visit naturally re-triggers
- Counters also re-animate when the `dashboard-stats` query refetches with new data (e.g. after a unit mutation on another page)
- No session-level deduplication flag needed — every mount and every data change re-animates

### UI-08 Faction Card Accent
- Phase 10 already delivered `ring-2 ring-faction-accent` on the active `FactionSummaryCard`
- Phase 11 verification only: confirm the ring renders with the correct faction color at runtime
- No additional changes to `FactionSummaryCard` are required — the Phase 10 implementation satisfies UI-08

### Claude's Discretion
- Exact rAF easing formula (e.g. `1 - Math.pow(1 - progress, 3)` cubic ease-out)
- Whether `useCountUp` accepts an optional `delay` parameter for staggered starts
- Loading skeleton design for the animated cards (if skeleton differs from current static skeleton)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §UI-07 — Animated stat counters spec: total units, painted count, battle-ready % animate from zero on first render
- `.planning/REQUIREMENTS.md` §UI-08 — Faction summary cards display with accent color borders/badges driven by active theme

### Phase 10 Foundation (must be complete before Phase 11)
- `.planning/phases/10-theming-foundation/10-CONTEXT.md` — Defines `bg-faction-accent` / `ring-faction-accent` CSS utilities, `ActiveFactionContext`, and `FactionSummaryCard` `isActive` ring behavior

No external specs — requirements are fully captured in REQUIREMENTS.md and the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/dashboard/StatCard.tsx` — The component to upgrade. Currently renders a plain `value` prop (number or string). Phase 11 adds count-up: either `StatCard` accepts an `animate?: boolean` prop and calls `useCountUp` internally, or the hero row uses an `AnimatedStatCard` wrapper
- `src/features/dashboard/FactionSummaryCard.tsx` — Already has `ring-2 ring-faction-accent` when `isActive=true`. No changes needed for UI-08
- `src/features/dashboard/computeStats.ts` — Provides all values that animate: `totalModels`, `fullyPainted`, `battleReadyPoints`, `activeProjectsCount`. No new computed values needed
- `src/hooks/useDashboardStats.ts` — Query key `["dashboard-stats"]` — mutations elsewhere already invalidate this, so re-animation on mutation is automatic when hook returns new data

### Established Patterns
- `useSidebarCollapsed.ts` and `useActiveFaction` — lightweight hook pattern to follow for `useCountUp`
- `requestAnimationFrame` loop pattern: start time captured in first frame, progress = elapsed/duration, clamp to [0, 1], apply easing, call `setValue(Math.round(eased * target))`
- TanStack Router unmounts on navigation — component lifecycle gives re-trigger for free, no extra state needed

### Integration Points
- `src/features/dashboard/DashboardPage.tsx` lines 183–188 — the 4 top hero `<StatCard>` calls; this is where count-up animation is wired
- The animated cards must not affect the loading skeleton branch (lines 94–147) — skeleton renders `<Skeleton>` not `<StatCard>`, so no conflict

</code_context>

<specifics>
## Specific Ideas

- No specific visual references given — standard ease-out counter is the right call
- The "serious command center" aesthetic (from PROJECT.md) favors fast, understated animation — 600ms ease-out hits that mark

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-dashboard-command-center*
*Context gathered: 2026-05-03*
