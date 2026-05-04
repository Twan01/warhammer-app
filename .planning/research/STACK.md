# Stack Research

**Domain:** Local-first Windows desktop — HobbyForge v2.2 Full Circle (10 new features on top of existing Tauri 2 + React 19 + Tailwind v4 + shadcn/ui + SQLite stack)
**Researched:** 2026-05-04
**Confidence:** HIGH — verified against package.json, existing source files, recharts GitHub package.json, shadcn/ui official docs, and Tauri v2 docs

---

## v2.2 Stack Decision: 1 New npm Package, 0 New Rust Crates, 0 Stack Changes

Nine of the ten new features are solved by the existing stack. Only the Spend Over Time chart and Hobby Velocity Tracker require a charting library. All other features (Battle Log, Wishlist, Goals, Streak, Ready-to-Play, Showcase, Lore notes, Undercoat Log) require no new packages.

### Feature-by-Feature Dependency Analysis

| Feature | New Package Needed? | Justification |
|---------|--------------------|-|
| Battle Log | NO | New SQLite table + TanStack Query + shadcn Table/Form. Same pattern as Army List Builder (Phase 8). |
| Wishlist / To-Buy | NO | New SQLite table + CRUD UI. Identical pattern to Collection (Phase 3) with a simpler schema. |
| Hobby Goals | NO | New SQLite table + progress math as a pure function (mirroring `computeSpendingStats`). shadcn Progress component already available. |
| Hobby Velocity Tracker | YES — `recharts` via shadcn chart | Requires a line/area chart showing painting pace over time. Plain text + numbers cannot communicate trend data. Pure calculation logic (pure function) needs no library — only the chart render does. |
| Spend Over Time | YES — `recharts` via shadcn chart | Requires a bar chart grouped by month/quarter. The existing Spending Tracker shows totals only. Time-series trend is the entire point of this feature. |
| Painting Streak | NO | Streak = consecutive ISO date strings from `painting_sessions`. Pure function: sort dates, compare adjacent days, count run. Native `Date` is sufficient. No date library needed. |
| Ready-to-Play Quick View | NO | Filter over existing `units` query by `painting_status = 'battle_ready'` + points cap. shadcn Table with column filter. Pattern from Collection page. |
| Showcase Mode | NO | `getCurrentWindow().setFullscreen(true)` from existing `@tauri-apps/api`. A filtered gallery grid is already in the stack from Phase 12. No new package. |
| Custom Lore Notes | NO | Two new text columns on existing tables (or separate `lore_notes` table) + a `<Textarea>` in the Unit sheet. react-hook-form + zod already handles form state. |
| Undercoat Log | NO | New column(s) on `units` table (primer name, primer color, date applied). Inline edit in unit detail sheet. Existing stack sufficient. |

---

## New Package for v2.2

### `recharts` ^3.8.1 — Charts for Spend Over Time and Velocity Tracker

**Why recharts:** shadcn/ui's official chart component (`npx shadcn@latest add chart`) is built on Recharts. This means the chart component inherits the shadcn design tokens (CSS variables, dark mode, faction accent colors via `--chart-1` through `--chart-5`) automatically. Adding Recharts through the shadcn chart component gives consistent visual style with zero custom theming work.

**Why not Chart.js or Victory:** Chart.js is a canvas-based library — it does not integrate with CSS custom properties or Tailwind v4 theming. Theming requires manual JS config. Victory is React-specific but heavier than Recharts and not part of the shadcn ecosystem. Recharts is SVG-based, composable, and the shadcn-blessed choice.

**Why not a pure D3 implementation:** D3 direct usage is 100–200 lines of imperative SVG manipulation per chart type. Recharts wraps D3 in React components. For two charts (bar + area/line), Recharts is the correct abstraction level.

**Why not Tremor:** Tremor wraps Recharts but adds its own design system that conflicts with shadcn/ui's zinc dark theme. Using the shadcn chart primitive directly avoids the double-abstraction.

**React 19 compatibility:** Recharts v3.8.1 explicitly declares `"react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"` in its peer dependencies. React 19 is a first-class peer. However, `react-is` is also a peer dependency — shadcn/ui's React 19 docs recommend adding a `package.json` override for `react-is` as a safety measure (see Installation section below).

**Tailwind v4 integration:** Recharts v3 + shadcn chart uses CSS variable syntax `var(--chart-1)` (not `hsl(var(--chart-1))`) — this matches Tailwind v4's `@theme inline` pattern already in use in `globals.css`. No extra config needed.

| Property | Value |
|----------|-------|
| Package | `recharts` |
| Version | `^3.8.1` |
| Add via | `npx shadcn@latest add chart` (installs recharts + adds `src/components/ui/chart.tsx`) |
| License | MIT |
| React 19 | YES — explicit peer dep |
| Tailwind v4 | YES — CSS var syntax matches existing globals.css pattern |
| Replaces | The v2.1 STACK.md explicitly deferred recharts as unnecessary for Spending Tracker. v2.2's time-series charts make it necessary. |

**Chart types needed:**
- **Spend Over Time** → `BarChart` grouped by month (x-axis) showing total pence per month. Data source: join `units.purchase_price_pence + units.created_at` + `paints.purchase_price_pence + paints.updated_at`.
- **Hobby Velocity Tracker** → `AreaChart` or `LineChart` showing cumulative models painted per week over time. Data source: `painting_sessions` grouped by `session_date` ISO week.

---

## What Does NOT Need a New Dependency

### Painting Streak — Native Date Math, No date-fns

The streak calculation is a pure function over ISO date strings. The existing codebase already parses SQLite dates manually (see `src/features/dashboard/relativeTime.ts`). The streak algorithm is:

```typescript
// Sort session_date strings descending, compare adjacent strings
// If today - previousDate === 1 day: streak continues
// If gap > 1 day: streak resets
```

This is 15–20 lines of vanilla TypeScript. Adding `date-fns` (4.1.0, ~25kB) for this one function is overkill. The existing pattern of `new Date(sqliteDate.replace(" ", "T") + "Z")` covers the parsing.

**Decision:** No date-fns. Streak logic goes in `src/features/hobby-goals/computeStreak.ts` as a pure function with unit tests.

### Showcase Mode — Existing Tauri API

`getCurrentWindow().setFullscreen(true)` is available from the existing `@tauri-apps/api` package (`^2.0.0`). The fullscreen toggle is 2 lines:

```typescript
import { getCurrentWindow } from "@tauri-apps/api/window";
await getCurrentWindow().setFullscreen(true);
```

No new Tauri plugin needed. No capability change needed (window methods are allowed by default in Tauri 2). The gallery grid component from Phase 12 (Collection Gallery View) is already built and can be reused or adapted.

### Hobby Goals Progress — shadcn Progress Component

shadcn/ui ships a `<Progress>` component. Monthly/quarterly targets with current counts are a simple `value / target * 100` percentage. No chart library needed — a progress bar is semantically correct for a goal tracker.

### Ready-to-Play Quick View — Existing Filter Pattern

The Collection page (Phase 3) already has a `applyUnitFilters` pure function and Zustand filter store. Ready-to-Play is a preset filter: `painting_status = 'battle_ready'` with an optional points cap. This is a new UI entry point (dashboard card or sidebar link) that reuses the existing filter infrastructure.

### Battle Log CRUD — Army List Builder Pattern

Battle Log schema: `id, date, opponent_faction, mission, outcome (win/loss/draw), army_list_id (FK, nullable), notes`. This is a standard CRUD table. The Army List Builder (Phase 8) established the pattern: `queries/battleLog.ts` → `useBattleLogs` hook → page component with Table + Sheet form. No new libraries.

### Custom Lore + Undercoat Log — Column Additions

Both are additive schema changes (new nullable columns on existing tables, or a linked `lore_notes` table). `react-hook-form` + `zod` + `<Textarea>` / `<Input>` handle the forms. No new packages.

### Velocity Tracker Calculations — Pure Function

The pace calculation (models painted per day/week, projected completion date) is arithmetic over `painting_sessions` rows. It's a pure function that takes sessions data and returns stats — same pattern as `computeSpendingStats`. Only the chart render needs Recharts; the math is framework-agnostic TypeScript.

---

## Confirmed Existing Stack (No Changes Required)

| Technology | Installed Version | v2.2 Role |
|------------|------------------|-----------|
| Tauri 2 | ^2.0.0 | Desktop shell — Showcase Mode fullscreen via existing `getCurrentWindow()` |
| React 19 | ^19.0.0 | UI — unchanged |
| TypeScript | ^5.6.3 | Types — new types for battleLog, wishlist, goals, lore, undercoat |
| Tailwind CSS | 4.2.4 | Styling — no changes |
| @tauri-apps/plugin-sql | ^2.4.0 | SQLite — all 10 features store data here |
| @tanstack/react-query | ^5.100.6 | Data fetching for all new features |
| @tanstack/react-router | ^1.168.26 | New routes: `/battle-log`, `/wishlist`, `/goals`, `/showcase` |
| zustand | ^5.0.12 | Filter state for Ready-to-Play, Showcase, possibly Goals |
| lucide-react | ^0.460.0 | Icons for all new pages |
| sonner | ^2.0.7 | Toasts on CRUD actions |
| react-hook-form + zod | ^7.74.0 / ^4.4.1 | Forms for Battle Log, Wishlist, Goals, Lore, Undercoat |
| shadcn/ui | CLI v4 | Progress component (Goals), existing Table/Sheet/Card for all CRUD |
| @tauri-apps/plugin-fs | ^2.5.1 | Already installed — Showcase Mode reads unit photos for gallery |
| @number-flow/react | — | Dashboard counters (installed v2.1) — may update Velocity stats display |
| dnd-kit | 6.3.1 / 10.0.0 | Not needed for v2.2 features |

---

## Installation for v2.2

```bash
# Step 1: Install recharts via shadcn chart component (preferred — gets the chart.tsx wrapper)
npx shadcn@latest add chart
# This installs recharts ^3.8.1 and creates src/components/ui/chart.tsx

# Step 2: Add react-is override to package.json for React 19 safety
# (See overrides block below)

# Step 3: Re-install to apply overrides
npm install
```

**package.json override to add (React 19 + recharts compatibility):**

```json
{
  "overrides": {
    "react-is": "^19.0.0"
  }
}
```

**No Cargo.toml changes.** No new Rust crates. No new Tauri capabilities.

---

## Alternatives Considered

| Recommended | Alternative | Why Alternative Rejected |
|-------------|-------------|--------------------------|
| `recharts` via `npx shadcn@latest add chart` | Chart.js | Canvas-based; does not integrate with CSS custom properties; manual theming required; not shadcn-blessed |
| `recharts` via `npx shadcn@latest add chart` | Victory | React-native focused, heavier bundle, not shadcn ecosystem |
| `recharts` via `npx shadcn@latest add chart` | Tremor | Wraps Recharts but adds conflicting design system; double-abstraction with shadcn already present |
| `recharts` via `npx shadcn@latest add chart` | Raw D3 | 100–200 lines of imperative SVG per chart type; Recharts wraps D3 at the right abstraction level for 2 charts |
| Native Date math for streak | `date-fns` ^4.1.0 | 25kB for a 15-line pure function; existing codebase already handles SQLite date parsing natively |
| `getCurrentWindow().setFullscreen()` | New Tauri plugin | Already in `@tauri-apps/api` — no plugin needed |
| shadcn `<Progress>` for Goals | Recharts radial chart | Progress bar is semantically correct for a goal tracker; radial chart is visual complexity without benefit |

---

## What NOT to Add for v2.2

| Avoid | Why Not | Use Instead |
|-------|---------|-------------|
| `date-fns` / `dayjs` / `luxon` | Streak + velocity date math is 15–25 lines of vanilla TypeScript. Existing codebase pattern (see `relativeTime.ts`) handles SQLite date strings natively. | Native `Date` + existing patterns |
| `react-calendar-heatmap` | Painting streak is a single number + "X day streak" badge. A GitHub-style heatmap is a phase-N feature if ever. | Plain stat card with `@number-flow/react` |
| `react-big-calendar` / `fullcalendar` | No calendar view needed for Goals or Battle Log in v2.2. | shadcn Table for log, shadcn Progress for goals |
| `Tremor` | Wraps Recharts with its own design system that fights the existing zinc/shadcn dark theme. | `recharts` directly via `npx shadcn@latest add chart` |
| `Chart.js` | Canvas-based; CSS variable theming not supported; faction accent colors would require manual JS config on every render. | Recharts (SVG, CSS vars work natively) |
| Any new Tauri plugin | Showcase Mode uses `@tauri-apps/api` window API (already installed). No new file access patterns beyond what `tauri-plugin-fs` already covers. | Existing `@tauri-apps/api` + `@tauri-apps/plugin-fs` |
| Any ORM | Still a dead-end in Tauri production. Raw `tauri-plugin-sql` continues to work well across 10+ query files. | Raw typed query functions in `src/db/queries/` |

---

## Phase Dependency for the One New Package

`recharts` is only needed for Spend Over Time and Hobby Velocity Tracker. All other v2.2 features can be built and shipped independently. Suggested phase sequencing for the install:

| Phase | Feature | Install recharts? |
|-------|---------|------------------|
| First analytics phase | Spend Over Time chart | YES — install here |
| Velocity Tracker phase | Hobby Velocity Tracker | Already installed |
| All other phases | Battle Log, Wishlist, Goals, Streak, Ready-to-Play, Showcase, Lore, Undercoat | NO |

The `npx shadcn@latest add chart` command should run in whichever phase first builds a chart (Spend Over Time is the natural first, as the data already exists from v2.1's Spending Tracker).

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `recharts ^3.8.1` | React 19 `^19.0.0` | Explicit peer dep `^19.0.0` in recharts v3 package.json — HIGH confidence |
| `recharts ^3.8.1` | Tailwind v4 + CSS vars | Uses `var(--chart-1)` syntax (not `hsl(var(...))`) — matches Tailwind v4 `@theme inline` already in use |
| `recharts ^3.8.1` | shadcn/ui chart wrapper | shadcn chart component now uses Recharts v3; `npx shadcn@latest add chart` pulls the matching version |
| `react-is ^19.0.0` override | `recharts ^3.8.1` | react-is still listed as peer dep in recharts v3; override ensures npm resolves it to React 19 version |
| `@tauri-apps/api ^2.0.0` | `getCurrentWindow().setFullscreen()` | Window API confirmed in Tauri v2 JS docs; no extra capability config needed |

---

## Sources

- `package.json` (project) — confirmed all existing installed versions [HIGH confidence]
- `src/db/queries/paintingSessions.ts`, `src/db/queries/spending.ts` — confirmed existing data model for velocity + spend calculations [HIGH confidence]
- `src/features/dashboard/relativeTime.ts` — confirmed existing native Date pattern; no date library in use [HIGH confidence]
- `src/features/spending/computeSpendingStats.ts` — confirmed pure-function aggregation pattern for all new compute features [HIGH confidence]
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/chart) — `npx shadcn@latest add chart`, Recharts v3 basis, `var(--chart-1)` CSS variable syntax [HIGH confidence]
- [shadcn/ui React 19 docs](https://ui.shadcn.com/docs/react-19) — react-is override requirement confirmed for recharts + React 19 [HIGH confidence]
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — chart color syntax change to `var(--chart-1)` confirmed [HIGH confidence]
- [recharts/recharts package.json (main branch)](https://github.com/recharts/recharts/blob/main/package.json) — peer deps `react ^19.0.0`, `react-is ^19.0.0` confirmed [HIGH confidence]
- [recharts v3.0.0 release](https://github.com/recharts/recharts/releases/tag/v3.0.0) — React 19 support, portal tooltips, accessibility defaults [HIGH confidence]
- recharts latest version 3.8.1 confirmed via multiple npm search results [HIGH confidence]
- [Tauri v2 Window API docs](https://v2.tauri.app/reference/javascript/api/namespacewindow/) — `getCurrentWindow().setFullscreen(true)` confirmed, no extra plugin [HIGH confidence]
- [recharts React 19 issue #4558](https://github.com/recharts/recharts/issues/4558) — v3 resolves the React 19 rendering issues present in v2.x [MEDIUM confidence — issue resolution, not official docs]

---

*Stack research for: HobbyForge v2.2 — Full Circle (Battle Log, Wishlist, Goals, Velocity Tracker, Spend Over Time, Streak, Ready-to-Play, Showcase, Lore, Undercoat)*
*Researched: 2026-05-04*
