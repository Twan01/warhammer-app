# Stack Research

**Domain:** Local-first Windows desktop — HobbyForge v2.4 Premium Dashboard UX & Visual Polish
**Researched:** 2026-05-05
**Confidence:** HIGH — verified against package.json, existing source files, globals.css, and component inventory

---

## v2.4 Stack Decision: 0 New npm Packages, 0 New Rust Crates, 0 Stack Changes

Every v2.4 feature is solved by the existing stack. The milestone adds premium visual depth,
CSS grid layouts, photo-centric UI, army readiness calculations, recipe integration, and
spending intelligence — none of which require a new dependency.

---

## Feature-by-Feature Dependency Analysis

| Feature | New Package Needed? | Justification |
|---------|--------------------|-|
| Dashboard CSS grid layout | NO | Tailwind v4 `grid`, `grid-cols-*`, `col-span-*`, `grid-rows-*` utilities cover asymmetric 2-column layouts. Already in use in `DashboardPage` (4-column stat row, 2-column health section). |
| Premium visual depth (radial gradients, elevation) | NO | Tailwind v4 ships `bg-gradient-radial` and arbitrary gradient values via `[...]` syntax. Glassmorphism is `backdrop-blur-*` + `bg-*/opacity`. Box shadows use `shadow-*`. All presentational — pure CSS, no library. |
| Glass/elevated card surfaces | NO | Already handled by existing CSS custom properties (`--panel-elevated`, `--forge-black`, `--battle-gold` defined in `globals.css`). Tailwind utility tokens already mapped in `@theme inline`. No new token infrastructure needed. |
| CurrentFocusCard v2 (photo thumbnail) | NO | `useLatestUnitPhotos()` and `convertFileSrc()` already resolve `asset://` URLs for `<img>`. The gallery card in `UnitGallery` is the proven pattern. Apply it to `CurrentFocusCard`. |
| ActiveProjectsPanel (3-5 project cards) | NO | Projects are already in `useDashboardStats()` as `stats.activeProjects`. Card layout uses shadcn `<Card>`. No new data hook needed — extend existing query or derive from stats. |
| ArmyReadinessCard with target point selector | NO | Target selector is shadcn `<Select>` (already installed). Readiness math is pure TS: filter units with `status_painting === "Completed"`, sum points, compare to target. Pattern mirrors `ArmyListSummaryBar`. |
| Simplified HobbyPipeline (5 buckets) | NO | `HobbyPipeline` already receives `stats.units`. Regrouping 11 stages into 5 buckets is a pure-function change in `computeStats` or a new `groupPipelineStages` helper. |
| Clickable StatCards | NO | TanStack Router `useNavigate()` is already in scope. Add `onClick` + cursor styling to existing `StatCard`. |
| Faction Cards v2 (larger, expressive) | NO | `FactionSummaryCard` is a local component. Resizing and adding photo thumbnails is a JSX/CSS change. |
| Photos become central | NO | `useLatestUnitPhotos()` already returns `Map<unitId, UnitPhotoWithUrl>`. Passing the map to more components (focus card, project cards, activity feed) requires no new infrastructure. |
| Log Session updates painting status/progress | NO | Mutations `useUpdateUnit()` already update `status_painting` and `painting_percentage`. `LogSessionSheet` needs form fields added + mutation calls wired up. |
| Recipe ↔ faction/unit integration | NO | `useRecipes()` and `useRecipePaints()` hooks are already built. A recipe-link field on the unit detail sheet is a new FK column (migration) + a `<Select>` in the form. |
| Spending intelligence (cost per completed model, painted vs unpainted value) | NO | `computeSpendingStats` is a pure aggregation function. Add new derived fields: `costPerCompletedModel = totalUnitsPence / completedUnits.length`, `paintedValue = completedUnits.reduce(...)`. Same pattern, zero new dependencies. |

---

## Confirmed Existing Stack — All v2.4 Capabilities Covered

| Technology | Installed Version | v2.4 Role |
|------------|------------------|-----------|
| Tailwind CSS v4 | 4.2.4 | CSS grid layouts, radial gradients, backdrop-blur, box-shadow utilities |
| shadcn/ui (new-york/zinc) | CLI v4 | `<Select>` for target selector, `<Card>` for new panels, `<Progress>` for readiness bars, `<Badge>` for recipe links |
| @tanstack/react-query | ^5.100.6 | All data for new panels derives from existing query keys |
| @tanstack/react-router | ^1.168.26 | `useNavigate()` for clickable StatCards |
| @tauri-apps/plugin-fs | ^2.5.1 | Photo file reads already in use via `convertFileSrc` |
| @tauri-apps/api | ^2.0.0 | `convertFileSrc`, `appDataDir`, `join` — all already imported in `useUnitPhotos` |
| recharts | 3.8.0 | Existing `SpendTrendChart` covers all chart needs; spending intelligence panels use the same `BarChart` pattern |
| react-hook-form + zod | ^7.74.0 / ^4.4.1 | Log Session updates, recipe link field in UnitSheet |
| zustand | ^5.0.12 | Target point selector state (ephemeral — stays local or Zustand if shared across cards) |
| lucide-react | ^0.460.0 | Icons for new action buttons in focus card, project panel |
| sonner | ^2.0.7 | Toasts on Log Session save, recipe link mutations |
| tw-animate-css | latest | Existing CSS animation classes for panel transitions |

---

## What Each Visual Effect Uses (No New Libraries)

### Radial Gradients

Tailwind v4 arbitrary values work directly in class strings:

```tsx
// Radial gradient from faction accent outward — pure Tailwind v4
<div className="bg-[radial-gradient(ellipse_at_top_left,var(--faction-accent)_0%,transparent_60%)]" />
```

The `--faction-accent` CSS custom property is already defined and updated by `ActiveFactionContext`. Works in Tailwind v4 via `@theme inline` mapping to `--color-faction-accent`.

### Glassmorphism / Elevated Cards

Already available via Tailwind utilities — no library:

```tsx
<Card className="bg-panel-elevated/80 backdrop-blur-sm border border-border/40 shadow-lg" />
```

`bg-panel-elevated` is already a Tailwind utility token defined in `@theme inline` in `globals.css`.

### Photo Thumbnails on Dashboard Cards

Pattern already proven in `UnitGallery` and `GalleryCardPhoto`. Apply directly:

```tsx
// useLatestUnitPhotos() returns Map<number, UnitPhotoWithUrl>
// photo.assetUrl is already the asset:// URL ready for <img src>
<img src={photo.assetUrl} alt={unit.name} className="w-full aspect-video object-cover rounded-t-lg" loading="lazy" onError={() => setImgFailed(true)} />
```

### ArmyReadinessCard Target Selector

Uses existing shadcn `<Select>` and pure arithmetic:

```tsx
const READINESS_TARGETS = [500, 1000, 1500, 2000] as const;
// points from units where status_painting === "Completed"
// percentage = Math.round((readyPoints / targetPoints) * 100)
```

No new hook needed — `useDashboardStats()` already loads units with `status_painting` and `points`.

### Spending Intelligence Derived Metrics

Extends `computeSpendingStats` return type:

```typescript
// New fields on SpendingStats (no new package)
costPerCompletedModel: number;   // totalUnitsPence / completedCount (0 if no completed)
paintedValuePence: number;       // sum of purchase_price_pence for Completed units
unpaintedValuePence: number;     // totalUnitsPence - paintedValuePence
```

Pure arithmetic over the same `units` array already passed to `computeSpendingStats`.

---

## What NOT to Add

| Avoid | Why Not | Use Instead |
|-------|---------|-------------|
| `framer-motion` | Overkill for entrance animations in a single-user desktop app. `tw-animate-css` + Tailwind `transition-*` cover hover, progress bar, and skeleton reveals. | `tw-animate-css` classes + CSS `transition` |
| `react-image` / image optimization library | Local `asset://` files don't need CDN optimization, resizing pipelines, or lazy-loading abstractions. Native `<img loading="lazy" onError={...}>` is sufficient, as proven in `GalleryCardPhoto`. | Native `<img>` with `onError` fallback |
| `@number-flow/react` | The project already has a custom `useCountUp` hook (`src/hooks/useCountUp.ts`) that handles animated counter transitions for StatCards. No external package needed. | Existing `useCountUp` hook |
| `date-fns` / `dayjs` | No new date math beyond what's already handled natively in the codebase (`relativeTime.ts`, ISO string comparisons). | Native `Date` + existing patterns |
| CSS-in-JS (`styled-components`, `emotion`) | Tailwind v4 + CSS custom properties in `globals.css` already handle all dynamic theming via `--faction-accent`. CSS-in-JS conflicts with the existing pattern. | Tailwind utilities + inline `style` props for dynamic values |
| `react-virtualized` / windowing | Gallery and dashboard lists are small (personal tool, single faction, dozens of units max). No virtualization needed. | Direct `.map()` renders |
| Any chart library beyond recharts | `recharts` + shadcn chart wrapper already handles all spend/analytics charting. New spending intelligence panels use the same `BarChart`/`LineChart` primitives. | Existing `recharts` + `src/components/ui/chart.tsx` |
| Any new Tauri plugin | All required native capabilities (file access, SQL, dialog, HTTP) are already installed and configured. | Existing Tauri plugin set |
| Any ORM | `tauri-plugin-sql` with raw typed queries continues to work well. Army readiness and recipe linking are new SQL queries, not a new data access pattern. | Raw typed query functions in `src/db/queries/` |

---

## Migration Requirements (SQL Only — No New npm/Cargo)

v2.4 may require one additive SQL migration for recipe ↔ unit linking:

```sql
-- If recipe_id FK is not yet on units table (check schema first)
ALTER TABLE units ADD COLUMN recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL;
```

This is a new migration file in `src-tauri/migrations/` following the existing naming convention. No new Tauri plugin or Rust crate is needed — `tauri-plugin-sql` handles it automatically at startup.

---

## Version Compatibility — No Changes

All existing packages remain at their current versions. No compatibility issues introduced by v2.4 changes because no new packages are added.

| Package | Current Version | v2.4 Usage | Compatibility |
|---------|-----------------|-----------|---------------|
| `tailwindcss` | 4.2.4 | Radial gradient arbitrary values, `backdrop-blur`, `grid-cols-*` | Confirmed — arbitrary value syntax documented in Tailwind v4 |
| `recharts` | 3.8.0 | Spending intelligence charts reuse existing `SpendTrendChart` pattern | No change |
| `@tauri-apps/plugin-fs` | ^2.5.1 | Photo thumbnail URLs via `convertFileSrc` | Already proven in production (v2.1+) |
| `shadcn/ui` Select | Installed | ArmyReadinessCard target selector | Already installed, used in army list builder |

---

## Sources

- `package.json` (project) — confirmed all installed versions [HIGH confidence]
- `src/styles/globals.css` — confirmed `--panel-elevated`, `--battle-gold`, `--faction-accent` tokens and `@theme inline` mappings [HIGH confidence]
- `src/components/ui/` directory listing — confirmed `select.tsx`, `progress.tsx`, `card.tsx`, `chart.tsx` all present [HIGH confidence]
- `src/hooks/useUnitPhotos.ts` — confirmed `useLatestUnitPhotos()` pattern: `convertFileSrc(join(appDir, file_path))` returns ready-to-use `asset://` URLs [HIGH confidence]
- `src/features/units/UnitGallery.tsx` — confirmed `GalleryCardPhoto` fallback pattern with `onError` [HIGH confidence]
- `src/features/army-lists/ArmyListSummaryBar.tsx` — confirmed readiness calculation pattern (pure TS, no library) [HIGH confidence]
- `src/features/spending/computeSpendingStats.ts` — confirmed pure aggregation function pattern for spending intelligence extension [HIGH confidence]
- `src/hooks/useCountUp.ts` — confirmed custom animated counter hook exists; `@number-flow/react` not in `package.json` [HIGH confidence]
- [Tailwind v4 arbitrary values docs](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values) — radial gradient arbitrary value syntax confirmed [HIGH confidence]

---

*Stack research for: HobbyForge v2.4 — Premium Dashboard UX & Visual Polish*
*Researched: 2026-05-05*
