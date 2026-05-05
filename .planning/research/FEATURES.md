# Feature Research

**Domain:** Warhammer 40K hobby management desktop app (v2.4 Premium Dashboard UX)
**Researched:** 2026-05-05
**Confidence:** HIGH (competitor landscape analyzed, domain well-understood, all prior features shipped)

---

## Scope

This file covers the new capabilities targeted for v2.4. All v2.1–v2.3 features are shipped
and referenced only as dependencies or data sources. Research focuses exclusively on what
"premium dashboard polish, photo-centric hobby UI, and spending intelligence" means for:

1. Asymmetric dashboard grid layouts
2. Army readiness target tracking
3. Active project panels
4. Photo-centric hobby UIs
5. Recipe-unit-faction linking
6. Spending intelligence (cost per model, painted vs unpainted value)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that, given v2.3 is shipped with CurrentFocusCard, HobbyPipeline, and StatCards,
users now expect as the natural next step. Missing them makes v2.4 feel incremental rather
than transformative.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Asymmetric dashboard grid (CSS grid with spanning cards) | Bento-grid is the dominant premium dashboard pattern (2025–2026). Uniform vertical stacks read as generic admin, not personal hobby command centers. | LOW | Tailwind v4 CSS grid with `col-span` / `row-span` utilities. No new data. Pure layout refactor on existing dashboard components. |
| Clickable StatCards (navigate on click) | Every premium dashboard card is interactive. Clicking a KPI card to navigate to the underlying data is so standard that non-clickable cards feel broken. | LOW | Add `onClick` + `cursor-pointer` + `Link` wrapper to existing StatCard. Targets: collection, projects, battle log, spending pages. |
| Photos in dashboard context (Focus + Projects + Activity) | Thumbnails on cards are now established in Collection gallery (v2.3). Users expect this visual language to propagate to the dashboard. | LOW-MEDIUM | Reads from existing `image_assets` table. Thumbnail fetch query already used on collection gallery. Add to CurrentFocusCard and project cards. |
| Simplified pipeline (5 buckets not 11 raw statuses) | 11 status columns on a single-row pipeline widget is unreadable at a glance. Apps that display hobby progress use collapsed stage groups (Not Started / In Progress / Finishing / Done / Showcase). | MEDIUM | Schema stores 11 statuses — this is a display-only grouping. Map groups in TypeScript; no migration. Must define the 5 bucket boundaries clearly. |
| ArmyReadinessCard with target selector | Pile of Potential and BattleBase both offer a "how much of my army is playable at X points" answer. Users planning a game night need this before they open the Army Lists page. | MEDIUM | Target presets (500/1000/1500/2000pts). Reads from `units` (points, painting_percentage, faction_id). No new schema. SQL must filter by faction and sum qualifying painted-above-threshold points. |
| Log Session updates painting status | Logging a hobby session without any effect on underlying painting status creates a data inconsistency: the user logged progress but the collection shows no change. Apps like Brushrage and HobbyTracker Lite update the model's state on session log. | MEDIUM | LogSessionSheet (already ships in v2.3) needs a status-update field wired to the unit's `status_painting` column. Mutation must invalidate both `painting-sessions` and `units` query keys. |

### Differentiators (Competitive Advantage)

Features beyond competitor parity that make HobbyForge feel like a purpose-built personal
forge, not a generic tracker.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| ActiveProjectsPanel (3–5 project cards with photo + progress + actions) | No competing local-first miniature app surfaces active projects at dashboard level with contextual actions (log session, open project, view recipe). Most apps require navigating to a separate page first. | MEDIUM | Filters `painting_projects` where status is an "active" bucket. Each card shows: photo thumbnail, project name, linked units count, last-updated date, quick "Log Session" CTA. Reads from existing painting_projects + image_assets data. |
| CurrentFocusCard v2 (photo hero, action buttons, metadata row) | The single "what am I painting right now" question is the most-answered question in hobby tracking. Surfacing it with a real photo (not a placeholder icon), the unit's model count, points value, and direct actions (log session, open journal, change recipe) turns a stat into a workflow entry point. | MEDIUM | Reads: unit photo from `image_assets` (first image), unit points from `units.points`, model count from `units.model_count`, linked recipe from `units` FK if added. Actions open existing sheets. The photo is the core differentiator — requires a clean fallback for units with no photos. |
| Spending intelligence: cost per completed model | HobbyForge already tracks `purchase_price_pence` and `model_count` per unit, and painting status. "Cost per completed model = total_spend / fully_painted_model_count" is a compelling personal metric that no competitor surfaces. Hobbyists discuss this metric on forums constantly — tracking "sunk cost on unpainted pile" is a known pain point. | LOW | Pure computation: `SUM(purchase_price_pence) / SUM(model_count) WHERE painting_percentage = 100`. Displayed as a dashboard StatCard or in the Spending page. No new schema. |
| Spending intelligence: painted vs unpainted value split | Shows total spend split into "value locked in painted models" vs "value sitting in unpainted pile". Directly addresses the Warhammer community concept of "pile of shame" — giving it a monetary weight. Pile of Potential tracks painted % but not the monetary value split. | LOW | Two SQL aggregates on `units`: SUM where `painting_percentage = 100` vs SUM where not. No new schema. Displays as two-value summary or donut chart segment in Spending page. |
| Faction Cards v2 (larger, expressive, clear focus indicator) | v2.3 FactionSummaryCard shows a progress bar and battle-ready points. A v2 iteration that uses the faction accent color as a dominant visual element (large color band or gradient fill), shows a unit photo from the faction, and has a clear "active/focus" crown indicator makes the dashboard feel like *your* army showcase, not a generic data table. | MEDIUM | Reads from `factions` (color_theme, name) + `image_assets` (one photo from a unit in this faction). No new schema. The "focus" indicator reads from existing FactionContext (active faction ID). |
| Recipe ↔ unit ↔ faction linking surface | Recipes exist in the system but are disconnected from the dashboard and project context. Surfacing "this project uses recipe X" on the kanban card and "this recipe is used by N units in faction Y" on the recipe detail makes the whole system feel integrated. Competitor apps (Brushrage, impcat) link recipes to projects but not to faction hierarchy. | MEDIUM | Requires a `recipe_id FK` on `units` table (new column, migration). Or: read-only join via `painting_projects` if projects already link to both units and recipes. Audit current schema first before deciding migration strategy. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Drag-to-resize dashboard cards | "I want to customize the layout" | Implementing a drag-resize grid (like Gridster or react-grid-layout) is a full product unto itself. Adds significant bundle weight. The designed hierarchy IS the information architecture. | Fixed asymmetric grid with thoughtful default proportions; no user resize |
| Per-model photo gallery (sub-unit level) | "I want to show each individual Space Marine" | HobbyForge tracks at unit level. Per-model tracking is a data model overhaul. Miniarx does this — it's their primary differentiator. | Per-unit photos with multi-image support covers 90% of the use case |
| AI recipe suggestion ("generate a recipe for this faction's colors") | "Tell me how to paint this" | Requires LLM API calls — violates local-first, no-network constraint. Could hallucinate paint names. | Manual recipe entry with paint swatch strip (v2.3 already ships this on recipe cards) |
| Cloud photo storage / sync | "I want my photos on my phone too" | Hard incompatibility with local-first architecture. Tauri filesystem access is local. Cloud sync requires an account system. | Local photos only; future companion milestone if warranted |
| Cost forecasting / budget alerts | "Warn me before I overspend" | Budget limit management adds a settings/preferences surface. Notification permission complexity on Tauri. The user is also the only person who sets budgets. | Show actuals clearly; user self-regulates |
| Animated spending charts (value changes over time like a stock ticker) | "Make it feel alive" | D3 animation in React + shadcn/ui Recharts is non-trivial; adds jank risk on slow SQLite queries; no new data insight | Static charts with hover tooltips are sufficient and snappier |
| Full-screen "painting mode" timer on dashboard | "I want a timer visible while I paint" | A full-screen painting timer is a different mental model than a dashboard. LogSessionSheet already handles session logging. | Log session after the fact via LogSessionSheet (already shipped) |

---

## Feature Dependencies

```
CSS Grid Layout (asymmetric)
    no data deps — layout only
    enables──> better visual space for all other dashboard features

CurrentFocusCard v2
    reads from──> image_assets (unit photos) [v2.1 — shipped]
    reads from──> units (model_count, points, faction_id)
    optionally reads from──> recipes (linked recipe_id — requires recipe↔unit FK)
    enables──> LogSessionSheet (action button target — already shipped)

ActiveProjectsPanel
    reads from──> painting_projects (status, updated_at, linked units)
    reads from──> image_assets (project/unit photo thumbnail)
    enhances──> LogSessionSheet (quick action on each card — already shipped)

ArmyReadinessCard
    reads from──> units (points, painting_percentage, faction_id) [shipped]
    reads from──> factions (name, color_theme) [shipped]
    depends on FactionContext (active faction selection — v2.1, shipped)

Simplified Pipeline (5 buckets)
    reads from──> units (status_painting counts — already in dashboard query)
    no data deps — display grouping only

Clickable StatCards
    no data deps — navigation only
    requires TanStack Router links [shipped]

Spending Intelligence (cost per model, painted vs unpainted split)
    reads from──> units (purchase_price_pence, model_count, painting_percentage)
    all data already exists — no migration
    enhances──> SpendingPage (new summary metrics alongside existing chart)

Faction Cards v2
    reads from──> factions (color_theme, name)
    reads from──> image_assets (one unit photo per faction — optional, with fallback)
    reads from──> FactionContext (active faction indicator)
    enhances──> FactionSummaryCard (replaces or extends it)

Recipe ↔ unit ↔ faction linking
    requires──> schema migration: recipe_id FK on units table (NEW column)
    OR reads via painting_projects if projects already join both
    enhances──> RecipeDetailSheet (show "used by N units" count)
    enhances──> CurrentFocusCard v2 (show linked recipe name)

Log Session updates status
    extends──> LogSessionSheet (add status update field — existing component)
    mutates──> units (status_painting column)
    must invalidate──> ["units"], ["dashboard-stats"], ["painting-sessions"] query keys

Photos become central (thumbnails across dashboard)
    reads from──> image_assets (entity_type='unit', entity_id) [v2.1 — shipped]
    enhances──> CurrentFocusCard v2
    enhances──> ActiveProjectsPanel
    enhances──> RecentActivityFeed
    no new schema — photo infrastructure already exists
```

### Dependency Notes

- **Recipe ↔ unit linking is the highest-risk dependency.** Auditing whether `painting_projects` already creates the needed join is the first task before writing any migration. If projects bridge units and recipes, no migration is needed. If not, `units.recipe_id` or a join table is required.

- **Photos have a common fallback problem.** Units without photos should show a tasteful placeholder (faction-colored icon, not a broken image frame). This pattern must be defined once and reused across CurrentFocusCard v2, ActiveProjectsPanel, and Faction Cards v2.

- **ArmyReadinessCard and Simplified Pipeline both read from units status data** already fetched by the dashboard query. Co-locating these in one `useDashboardStats` hook call avoids N+1 queries.

- **Log Session updating status requires careful invalidation.** The mutation touches `units`, which invalidates `["dashboard-stats"]`, `["units"]`, and potentially army list readiness calculations. Must not double-update if a status was already set.

---

## Prioritization for v2.4

### Must Ship (Core of Milestone)

These define "premium dashboard UX" — without them v2.4 is just polish:

- [ ] CSS Grid layout (asymmetric 2-column) — defines the new dashboard structure
- [ ] CurrentFocusCard v2 with photo hero — most-used dashboard element
- [ ] ActiveProjectsPanel — new primary panel that justifies the grid
- [ ] ArmyReadinessCard with target point selector — answers the "can I play?" question
- [ ] Simplified pipeline (5 buckets) — makes the pipeline widget readable
- [ ] Spending intelligence metrics (cost per model, painted/unpainted split) — low cost, high value

### Should Ship (Premium feel completes here)

- [ ] Clickable StatCards — zero-effort polish, expected by users
- [ ] Photos become central (thumbnail queries + fallback pattern) — visual upgrade across dashboard
- [ ] Log Session updates painting status — closes the data loop
- [ ] Faction Cards v2 — expressive visual upgrade for faction selection

### Add After Core Is Stable

- [ ] Recipe ↔ unit ↔ faction linking — depends on schema audit; defer if audit reveals migration needed
- [ ] Premium visual depth (radial gradients, card surface hierarchy) — CSS-only, add last as polish

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Schema Change | Priority |
|---------|------------|---------------------|---------------|----------|
| CSS Grid layout | HIGH | LOW | None | P1 |
| Spending intelligence metrics | HIGH | LOW | None | P1 |
| Clickable StatCards | HIGH | LOW | None | P1 |
| Simplified pipeline (5 buckets) | HIGH | LOW | None | P1 |
| Log Session updates status | HIGH | LOW-MEDIUM | None | P1 |
| Photos in dashboard (thumbnails) | HIGH | LOW-MEDIUM | None | P1 |
| CurrentFocusCard v2 | HIGH | MEDIUM | None (or recipe_id) | P1 |
| ArmyReadinessCard | HIGH | MEDIUM | None | P1 |
| ActiveProjectsPanel | HIGH | MEDIUM | None | P1 |
| Faction Cards v2 | MEDIUM | MEDIUM | None | P2 |
| Recipe ↔ unit linking | MEDIUM | MEDIUM | recipe_id on units | P2 |
| Premium visual depth | MEDIUM | LOW | None | P2 |

**Priority key:**
- P1: Required for v2.4 to feel like a milestone, not a patch
- P2: Valuable polish, add if P1 is stable; could slip to v2.5

---

## Competitor Feature Comparison

| Feature | Miniarx | Figure Case | HobbyTracker | Pile of Potential | HobbyForge v2.4 Approach |
|---------|---------|-------------|--------------|-------------------|--------------------------|
| Asymmetric dashboard grid | No (flat list) | No | No | No | CSS Grid bento layout — unique in local-first desktop hobby apps |
| Photo-centric UI | YES — core feature (photo tracking, galleries) | Partial (photo stages) | Progress photos | No | Photos promoted to all dashboard surfaces; local filesystem |
| Army readiness at target points | No | No | No | Partial (painted % only) | Target selector (500/1000/1500/2000) + per-faction readiness |
| Cost per painted model | No | No | Kit cost tracking only | No | Auto-calculated from existing purchase_price_pence + model_count |
| Painted vs unpainted value split | No | No | No | No | SQL aggregate split — first-class metric in Spending page |
| Recipe ↔ unit ↔ faction linking | No | No | No | No | FK on units table (if migration confirmed) — unique |
| Active project panel on dashboard | No (separate page) | No | No | No | 3–5 project cards with photo + quick actions on dashboard |
| Log session → status update | No | Yes (status change per stage) | Yes (session-linked status) | No | Extend existing LogSessionSheet with status update field |

---

## Data Gaps to Flag for Requirements

1. **Recipe ↔ unit schema:** Does `painting_projects` already provide the recipe-unit bridge?
   Audit `painting_projects` FK structure before writing any migration. If not, decide:
   (a) `units.recipe_id FK -> recipes(id)` (one recipe per unit, simplest), or
   (b) a join table `unit_recipes` (many-to-many, future-proof but higher cost).
   Recommendation: (a) for v2.4 since a unit realistically follows one recipe.

2. **Photo fallback pattern:** All new photo-bearing components need a consistent
   no-photo state. Define once: faction-color-filled placeholder with unit's first
   letter or a brush icon. Must render identically across CurrentFocusCard v2,
   ActiveProjectsPanel, and Faction Cards v2.

3. **ArmyReadiness point calculation:** The dashboard query needs points-per-faction
   already-painted (painting_percentage >= threshold). Confirm whether `units.points`
   is the entered points value (it is — manually entered by user per PROJECT.md constraint).
   COALESCE pattern from army list SQL applies here.

4. **Pipeline bucket boundaries:** The 11 statuses map to 5 display buckets.
   Must define the mapping explicitly before UI work:
   - Bucket 1 "Not Started": "Unpainted"
   - Bucket 2 "Assembly": "Assembled", "Built", "Primed"
   - Bucket 3 "In Progress": "Base Coated", "Layering", "Shading"
   - Bucket 4 "Finishing": "Highlighting", "Detailing", "Basing"
   - Bucket 5 "Done": "Fully Painted"
   (Exact status strings must be validated against PAINTING_STATUS_ORDER in `src/types/datasheet.ts`.)

---

## Sources

- Bento Grid Dashboard Design guide (orbix.studio) — asymmetric grid UX principles and CSS Grid implementation patterns
- Miniarx (miniarx.com) — photo-centric miniature collector dashboard, photo upload + status tracking
- Figure Case / Warganizer (App Store) — painting stage photo tracking, status-linked photos
- HobbyTracker Lite (App Store) — kit cost tracking, time tracking, session-linked status
- Brushrage (Play Store / reachu.io) — paint recipe + inventory integration with project tracking
- Pile of Potential (wargamer.com review) — pile-of-shame tracking, unit cost + painted % per project
- PatternFly Dashboard Patterns (patternfly.org) — status cards, card-footer actions, link-style buttons
- DakkaDakka / Warhammer community forums — "cost per model" metric, pile of shame monetary framing (community validation that this metric resonates)
- HobbyForge PROJECT.md — confirmed existing schema capabilities and out-of-scope constraints
- HobbyForge FEATURES.md (v2.2) — prior feature landscape; confirmed all v2.1–v2.3 shipped features

---

*Feature research for: HobbyForge v2.4 — Premium Dashboard UX & Visual Polish*
*Researched: 2026-05-05*
