# Feature Research

**Domain:** Warhammer 40K hobby management desktop app (v2.2 Full Circle)
**Researched:** 2026-05-04
**Confidence:** HIGH (schema verified, competitor UX cross-referenced, domain well understood)

---

## Scope

This file covers the ten new features in v2.2. All v2.1 features (Theming, Dashboard,
Gallery, Hobby Journal, Spending Tracker, 40K Datasheet Integration, Design Overhaul)
are already shipped and referenced only as data sources or dependencies, not re-researched.

---

## Feature-by-Feature Analysis

---

### 1. Battle Log

**Expected UX (from Tabletop Battles, BattleBase, ServoCrypt)**

Users expect a chronological list of past games with a simple "Log a Game" entry form.
Minimum expected fields: date, opponent faction, mission name, my score, opponent score,
result (W/L/D), and which army list was used. After logging, the list page shows aggregate
stats inline (win rate, games played, last game date). A detail view shows the full record.

**Table Stakes:**
- Date, opponent faction, mission, result (W/L/D), my score, opponent score
- Which army list was used (FK to existing `army_lists` table)
- Chronological log list view with win/loss/draw badge
- Win rate summary stat (total games, wins, losses, draws)

**Differentiators for HobbyForge:**
- MVP unit and underperforming unit fields (already in schema — use them)
- Lessons learned / changes next time free text (post-game reflection fields)
- Tie to army list: show which list was played per game, surface the battle-ready
  percentage of that list

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Real-time in-game scoring (turn-by-turn CP, objective tracking per round) | HobbyForge is a hobby OS, not a live game assistant. Requires the app open during a game; breaks the async personal-tool model. Tabletop Battles does this — don't compete with it. | Record final score post-game only |
| Win rate by opponent player name | Implies tracking named people; premature. Faction-level win rate is the useful metric | Opponent faction (free text) |
| Crusade / campaign tracking (unit XP, battle honors, battle scars) | Full separate feature domain (ServoCrypt's entire purpose). Doubles schema complexity. | Custom lore notes covers informal narrative; scope Crusade as v3+ |

**Complexity:** MEDIUM for UI scope, but LOW for schema — `battle_logs` table already
exists in migration 001 with every needed column. No schema migration required. Work is
purely UI: list page, log form, result badge, summary stats.

**Data shape (existing schema — migration 001, no migration needed):**
```sql
battle_logs (
  id, army_list_id FK->army_lists, battle_date TEXT,
  opponent TEXT, opponent_faction TEXT, mission TEXT,
  points_played INTEGER, result TEXT,
  my_score INTEGER, opponent_score INTEGER,
  mvp_unit_id FK->units, underperforming_unit_id FK->units,
  lessons_learned TEXT, changes_next_time TEXT, notes TEXT
)
```

---

### 2. Wishlist / To-Buy

**Expected UX (from Citadel Colour app, Liber Pigmenta, Pile of Potential)**

Users expect a list of models they intend to buy but don't yet own, separate from the
collection. The minimum expected UX: add a model name + faction, set a priority, and
one-click "promote to collection" that converts the entry into a real owned unit.
The paints table already has a `wishlist INTEGER` boolean flag — the concept is
established in the app; the unit-level wishlist needs a proper entity.

**Table Stakes:**
- Unit name, faction assignment, optional price estimate
- Priority / want level (Low / Medium / High or numeric)
- "Promote to collection" action: creates a real unit from the wishlist entry
- Filter by faction
- Total estimated spend for wishlist (sum of price estimates)

**Differentiators:**
- Link a wishlist item to an existing army list ("I want this for my Necron list") —
  surfaces purchase intent for army building
- Points estimate field — lets user mentally plan list impact before buying

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| External links to store pages | URL management, link rot, no network calls per constraint | Manual name entry |
| Automatic GW price lookup | Violates local-first constraint; no internet calls | Manual pence entry (same as spend tracker) |
| Per-item photo | Adds friction to a lightweight "quick note" feature; user doesn't own the model yet | Photos belong on owned units |

**Complexity:** LOW-MEDIUM. Needs a new table (paints.wishlist is a boolean flag, not an
entity). New table + simple CRUD page + "promote" action that pre-fills the UnitSheet form.

**Data shape (new table needed):**
```sql
wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faction_id INTEGER REFERENCES factions(id) ON DELETE SET NULL,
  army_list_id INTEGER REFERENCES army_lists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit_type TEXT,
  points_estimate INTEGER,
  price_estimate_pence INTEGER,
  priority TEXT NOT NULL DEFAULT 'Medium',  -- 'Low' | 'Medium' | 'High'
  notes TEXT,
  promoted_at TEXT,  -- set when promoted to collection; acts as soft-archive flag
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

---

### 3. Hobby Goals

**Expected UX (from habit tracker apps: Strides, Streaks, Spark gamification)**

Users expect to set a painting target (e.g., "paint 10 models this month") with a deadline
and see live auto-progress. Standard UX: goal title, target count, period (monthly /
quarterly / custom), current progress auto-calculated from existing data, progress bar.

**Table Stakes:**
- Goal title, target count (number of units to reach a painted status)
- Period type: monthly, quarterly, or custom date range
- Progress: auto-derived from units reaching the target status within the period
- Progress bar / percentage display
- Goal status: Active / Completed / Expired

**Differentiators:**
- Auto-calculate progress from existing data (units where `status_painting` reached
  target threshold AND `updated_at` falls within the goal period) — HobbyForge has
  the data already; generic goal apps require manual check-ins
- Faction-scoped goals ("paint 5 Necron units this quarter")

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Multiple goal metric types (sessions-based, paints-used, points-painted) | Cognitive overhead of defining custom metrics outweighs value for a personal tool | Unit count reaching a painting status is the universal metric |
| Push notifications / reminders | Platform permission complexity; Tauri notifications add build surface. User sees goals on dashboard. | Dashboard widget shows goal progress passively |
| Goal sharing or public accountability | Local-first, single-user | Not applicable |

**Complexity:** MEDIUM. New table + query logic that compares `units.updated_at` against
the goal period. Key data gap: `updated_at` is updated on ANY field change, not only
painting status changes — progress attribution is approximate. Requirements must decide
whether to accept this or add a `painting_completed_at` timestamp.

**Data shape (new table needed):**
```sql
hobby_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  faction_id INTEGER REFERENCES factions(id) ON DELETE SET NULL,
  goal_type TEXT NOT NULL DEFAULT 'units_painted',
  target_count INTEGER NOT NULL,
  period_type TEXT NOT NULL,  -- 'monthly' | 'quarterly' | 'custom'
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'expired'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

Progress is computed at query time: count units where `status_painting` >= threshold AND
`updated_at BETWEEN period_start AND period_end` AND optional `faction_id` match.

---

### 4. Hobby Velocity Tracker

**Expected UX (from Pile of Potential "progress summaries", Liber Pigmenta army manager)**

Users expect auto-calculated analytics: how many units I complete per month on average,
and a projected date when my current unpainted pile will be done. This is a dashboard-level
analytics widget, not a CRUD feature. It surfaces computed insights from existing data.

**Table Stakes:**
- Average units painted per month (rolling window: 3-month and 6-month)
- Pile-of-shame count: units owned but not fully painted
- Projected completion date at current velocity (pile / monthly rate = months remaining)
- "Units painted this month" counter

**Differentiators:**
- Session-based velocity from `painting_sessions`: average session duration + sessions
  per month — finer granularity than units-per-month alone
- Trend indicator: "faster than last month" / "slower than last month"

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Per-faction velocity breakdown | Fragments the motivational metric; noise for a single-army painter | Faction-specific progress lives in Hobby Goals |
| ML/curve-fitting velocity prediction | Overkill. Linear projection is accurate enough and immediately understandable | pile_count / avg_per_month = months remaining |
| Standalone page | Velocity is an insight, not a workflow. A dashboard widget or analytics section is the right container | Embed in Dashboard or a new Analytics section |

**Complexity:** LOW. Pure SQL computation on existing data. No new table needed.

**Data shape (no new schema):**
Reads from `units` (status_painting, updated_at) and `painting_sessions` (session_date,
duration_minutes). SQL:
```sql
-- Units painted per month (last 6 months)
SELECT strftime('%Y-%m', updated_at) as month, COUNT(*) as painted
FROM units
WHERE status_painting = 'Fully Painted'
  AND updated_at >= date('now', '-6 months')
GROUP BY month ORDER BY month

-- Pile of shame count
SELECT COUNT(*) FROM units WHERE painting_percentage < 100
```

---

### 5. Spend Over Time Chart

**Expected UX (from expense tracker apps, shadcn/ui Recharts bar chart patterns)**

Users expect a bar chart grouped by month or quarter showing spend per period.
The Spending Tracker page already shows totals; this is a trend chart on top of that
existing data. Standard pattern: X-axis = time period label, Y-axis = spend in
pounds/euros, bars per period, hover tooltip showing total.

**Table Stakes:**
- Bar chart: one bar per month, height = total spend (units + paints) in that period
- Period toggle: monthly / quarterly
- Hover tooltip with period total
- Cover all factions, or filter by faction

**Differentiators:**
- Cumulative spend line overlaid on bars (running total) — shows total hobby cost at
  a glance
- Purchase date filtering scoped to faction — "how much have I spent on Necrons per month"

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Budget vs actual comparison | Requires budget limit management UI; significant scope for a personal tool | Show actuals only; user interprets |
| Stacked bars (units vs paints per period) | Legend complexity; hard to read for dense data | Separate summary line items below the chart |
| Export to CSV | Out of scope (backup/export deferred per PROJECT.md) | Not applicable |

**Complexity:** LOW. Reads `units.purchase_price_pence + units.purchase_date` and
`paints.purchase_price_pence`. Groups by month via SQLite `strftime`. Chart component
uses shadcn/ui's built-in Recharts wrapper (already in the project). One SQL query +
one chart component.

**Known data gap:** `paints` has `purchase_price_pence` (added Phase 14) but NO
`purchase_date` column. Paint spend in the chart must use `paints.created_at` as a proxy
for purchase date. Requirements must explicitly acknowledge this limitation and decide:
(a) accept the proxy, or (b) add `purchase_date TEXT` to paints in v2.2 migration.

**Data shape (no new schema unless paint purchase_date is added):**
```sql
SELECT strftime('%Y-%m', purchase_date) as period,
       SUM(purchase_price_pence) as total_pence
FROM units
WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL
GROUP BY period ORDER BY period
```

---

### 6. Painting Streak

**Expected UX (from Duolingo, GitHub contribution graph, Smashing Magazine 2026 streak
design article)**

Users expect a counter showing consecutive days with hobby activity, a visual calendar
or activity grid, and a "best streak" record. This is a motivational gamification feature
that leverages the existing `painting_sessions` table.

**Table Stakes:**
- Current streak: consecutive days with at least one `painting_sessions` record
- Longest streak ever
- Visual indicator on dashboard (flame icon + number)
- "Active today" boolean (today's session count > 0)

**Differentiators:**
- Mini activity grid (GitHub contribution-graph style) showing active days over the
  past 90 days — gives visual momentum feedback beyond a single number
- "Active yesterday" near-miss indicator: streak isn't broken yet if user just missed
  midnight — grace until end-of-day (implementation: check if gap between today and
  last session is 1 day, not 2+)

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Streak freeze / repair mechanic (Duolingo-style purchase) | Misleads the user about actual habit; undermines the motivation mechanism for a personal tool | Honest reset; longest-streak record provides retrospective pride |
| Push notifications to maintain streak | System permission complexity for a desktop Tauri app; annoying for a personal tool | Dashboard visual is sufficient |
| Per-unit or per-faction streaks | Fragments the global habit metric; loses motivational effect | Global streak only |

**Complexity:** LOW. Pure computation on `painting_sessions.session_date`. Algorithm:
select distinct session dates DESC, count consecutive days from today backward. O(n)
over sessions table. No new schema.

**Data shape (no new schema):**
```sql
SELECT DISTINCT session_date FROM painting_sessions ORDER BY session_date DESC
```
Then compute consecutive day gaps in TypeScript. Current streak = days back until first
gap of >1 day. Longest streak = max consecutive run across all sessions.

**Prerequisite dependency:** Painting Streak is meaningless without `painting_sessions`
data. Hobby Journal (Phase 13) must be shipped — it is (v2.1).

---

### 7. Ready-to-Play Quick View

**Expected UX (from BattleBase army manager, Pile of Potential army tracking)**

Users expect a filtered view of their collection showing only units that meet
"battle-ready" criteria: painting status at or above a threshold AND fitting within a
points budget. This is a filtered view on existing collection data, not a new entity.

**Table Stakes:**
- Filter units by painting status threshold (e.g., "Base Coated and above" or
  "Fully Painted only")
- Filter by points limit (show units where cumulative selected points <= limit)
- Faction filter
- Points total of the visible filtered set
- Battle-ready % for the filtered result

**Differentiators:**
- "Create army list from these units" — one-click action that pre-populates the
  Army List Builder with the filtered units. This is the full-circle connection:
  collection → ready-to-play → army list.
- Show existing army lists that could be played right now (i.e., all units in the list
  are at or above the battle-ready painting threshold)

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Legal detachment validation (minimum unit counts, detachment rules) | Requires rules engine; explicitly out of scope in PROJECT.md | Show points total; let user decide legality |
| Per-model granularity (are all 10 Intercessors painted?) | HobbyForge tracks at unit level; sub-unit tracking is new scope | Unit-level painting_percentage covers the use case |

**Complexity:** LOW. Filtered view on existing `units` data. No new schema. The filter
panel is simpler than the full collection page (fewer dimensions). "Create army list"
reuses existing army list creation flow.

**Data shape (no new schema):**
```sql
SELECT u.*, f.name as faction_name, f.color_theme
FROM units u
JOIN factions f ON u.faction_id = f.id
WHERE u.painting_percentage >= :threshold
  AND (u.faction_id = :faction_id OR :faction_id IS NULL)
  AND (u.points <= :max_unit_points OR :max_unit_points IS NULL)
ORDER BY f.name, u.name
```

---

### 8. Showcase Mode

**Expected UX (from hobby club night conventions — "I want to show my army on a laptop")**

Users expect a full-screen gallery showing only fully-painted units with their photos,
cycling through them manually or automatically. Think slideshow: large images, minimal
chrome, dark background, unit name and faction as overlay text. No competing local-first
desktop hobby app offers this.

**Table Stakes:**
- Full-screen display (sidebar + header hidden, OS chrome visible)
- Gallery of units where `painting_percentage = 100` AND has at least one image in
  `image_assets`
- Large image display with unit name and faction overlay
- Manual navigation (previous / next) keyboard and click
- Escape key exits showcase mode

**Differentiators:**
- Faction-filtered showcase (show only one army)
- Optional: lore text subtitle card per unit if Custom Lore Notes is also shipped
  (soft coupling — showcase works without lore)

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Auto-advance-only (no manual control) | At club nights users need to pause and talk; auto-advance without pause is frustrating | Auto-advance optional timer; always allow manual navigation |
| Web publishing / share links | Local-only by design | Not applicable |
| Annotation / drawing on image | Canvas drawing layer; vastly complex for zero additional value in target use case | Not applicable |

**Complexity:** MEDIUM. New full-screen route or modal, gallery component, keyboard
navigation, hide-chrome logic. Images come from existing `image_assets` table. Tauri
fullscreen API may be used for true OS-level fullscreen (`Window::set_fullscreen`).

**Key design constraint:** Showcase query must ONLY return units with at least one image.
Units with `painting_percentage = 100` but no photos produce a blank card — bad UX.

**Data shape (no new schema):**
```sql
SELECT u.id, u.name, u.lore, f.name as faction_name, f.color_theme,
       ia.file_path as image_path, ia.caption
FROM units u
JOIN factions f ON u.faction_id = f.id
JOIN image_assets ia ON ia.entity_type = 'unit' AND ia.entity_id = u.id
WHERE u.painting_percentage = 100
  AND (u.faction_id = :faction_id OR :faction_id IS NULL)
ORDER BY f.name, u.name
```

Note: `u.lore` only exists once Custom Lore Notes migration runs. Query must handle NULL.

---

### 9. Custom Lore Notes

**Expected UX (from ServoCrypt unit cards, Warhammer Crusade narrative conventions)**

Users expect free-text fields to write narrative lore — backstory, battle history, squad
names — for both factions and individual units. This is the simplest feature: a textarea
that saves. Warhammer players universally name squads and write backstory; this is
table stakes for a "hobby OS" claiming to cover the full hobby loop.

**Table Stakes:**
- Free-text lore field per unit (squad name, notable battles, character name)
- Free-text lore field per faction (origin story, homeworld, heraldry notes)
- Accessible from unit detail sheet and faction detail view
- Auto-save or explicit Save button (consistent with existing patterns in the app)

**Differentiators:**
- Lore text visible in Showcase Mode as a subtitle card — connects narrative to visual
  showcase (soft coupling; showcase works without lore)
- Optional Markdown rendering (bold, italic, bullet lists) — lets users structure lore
  without a full rich text editor

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Full WYSIWYG rich text editor | Disproportionate dependency complexity for a personal notes field | Textarea with optional Markdown preview |
| Lore linking between units ("this squad fought with that squad") | Graph-style relationship tracking; full campaign management domain | Keep lore as flat per-entity text |
| Word count limits or lore templates | Adds friction with no benefit for a single user | Open-ended textarea |

**Complexity:** LOW. Simplest feature in v2.2. Two ALTER TABLE migrations + textarea UI
in existing surfaces (unit detail sheet + faction detail). No new page or route needed.

**Data shape (two ALTER TABLE migrations needed):**
```sql
ALTER TABLE units ADD COLUMN lore TEXT;
ALTER TABLE factions ADD COLUMN lore TEXT;
```

---

### 10. Undercoat Log

**Expected UX (from Liber Pigmenta painting flow, DakkaDakka primer discussions)**

Users expect to record which primer/undercoat was applied to a unit so they can
reproduce it when painting more models from the same army. Simple record per unit:
product name, color, application method. Visible on the unit detail sheet and
filterable on the collection page.

**Table Stakes:**
- Primer/undercoat product name per unit (free text: "Chaos Black Spray", "Grey Seer",
  "Wraithbone")
- Application method (spray can, brush, airbrush)
- Visible on unit detail sheet
- Collection page filter: "show me all units primed with Wraithbone"

**Differentiators:**
- Optional FK link to `paints` table (`undercoat_paint_id`): if the primer is in the
  paint inventory, link it — the inventory's running_low flag then also applies to the
  undercoat. This is a differentiator, not table stakes.
- "Same as faction default" display: if many units share the same undercoat, indicate
  it rather than repeating per unit (UI convenience, not a schema feature)

**Anti-features:**
| Anti-Feature | Why Problematic | Alternative |
|--------------|-----------------|-------------|
| Undercoat as a full separate entity with its own CRUD page | Overengineered; this is a field on a unit, not a first-class entity | Fields on unit detail sheet |
| Photo of the undercoated model | Hobby Journal already handles per-unit photos at any stage | Use Hobby Journal's photo timeline |
| Multiple undercoats per unit (full zenithal: two products) | Dramatically complicates data model for a minority use case | Single undercoat record; zenithal details go in painting recipe notes |

**Complexity:** LOW. Two or three ALTER TABLE columns on `units`. No new page needed.

**Data shape (ALTER TABLE migration needed):**
```sql
ALTER TABLE units ADD COLUMN undercoat_name TEXT;
ALTER TABLE units ADD COLUMN undercoat_method TEXT;  -- 'spray' | 'brush' | 'airbrush'
ALTER TABLE units ADD COLUMN undercoat_paint_id INTEGER REFERENCES paints(id) ON DELETE SET NULL;
```

---

## Feature Landscape Summary

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Battle Log | Every game tracking app records wins/losses/missions | MEDIUM | Schema already exists in migration 001 — UI only |
| Wishlist / To-Buy | Paints already have wishlist flag; unit wishlist is the natural extension | LOW-MEDIUM | New table needed |
| Hobby Goals | Habit trackers universally offer goal + progress bars | MEDIUM | New table; auto-progress from unit data |
| Painting Streak | Ubiquitous since Duolingo made it the norm; painting_sessions data already available | LOW | Pure computation on existing data |
| Custom Lore Notes | Warhammer players universally name squads and write backstory | LOW | Two ALTER TABLE + textarea UI |
| Undercoat Log | Painters need to reproduce primer setups across batch painting sessions | LOW | 2-3 columns on units + unit detail field |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hobby Velocity Tracker | Auto-projects pile-of-shame completion — unique because data already exists | LOW | Dashboard widget; no new schema |
| Spend Over Time Chart | Trend chart from existing pence data — zero extra data entry | LOW | One chart component + one SQL query |
| Ready-to-Play Quick View | Bridges collection → playing by filtering battle-ready units with points limit | LOW | Filter view on existing collection data |
| Showcase Mode | Full-screen gallery for club nights — no competing local-first hobby app does this | MEDIUM | New route, keyboard nav, fullscreen API |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live in-game scoring (turn-by-turn) | "Track the game as you play" | Requires app open during play; different UX paradigm; Tabletop Battles does this | Record final score post-game |
| Crusade / campaign unit XP | Narrative players want unit progression | Full separate domain; doubles schema complexity | Lore notes for informal narrative; Crusade is v3+ |
| Budget vs actual tracking | "Am I overspending?" | Budget limit management UI adds significant scope | Wishlist total shows intent; chart shows actual trend |
| Legal detachment validation | "Is this a legal list?" | Requires rules engine; explicitly out of scope | Points total shown; user decides legality |
| WYSIWYG rich text editor (Lore) | "I want formatted lore" | High-complexity dependency | Markdown textarea with preview |
| Multiple undercoats / full zenithal log | Zenithal priming is common | Dramatically complicates data model for minority use case | Zenithal details go in painting recipe notes |
| Undercoat photo capture | "Show me the primed model" | Duplicates Hobby Journal photo timeline | Use Hobby Journal for any painting-stage photo |
| Automatic price lookup for Wishlist | "Don't make me look up prices" | No network calls; local-first constraint | Manual pence entry |
| Per-faction velocity breakdown | "How fast am I painting Necrons?" | Fragments the habit metric | Global velocity; faction breakdown in Goals |
| Streak freeze / repair (Duolingo-style) | "I went on holiday" | Misleads user about actual habit | Honest reset; longest-streak provides retrospective pride |
| Automatic paint purchase date for chart | "I don't know when I bought it" | Paints have no purchase_date column currently | Use paints.created_at as proxy; or add purchase_date to paints in v2.2 migration |

---

## Feature Dependencies

```
Battle Log
    enhances──> Army List Builder (FK: army_list_id — which list was played)
    enhances──> Units (FK: mvp_unit_id, underperforming_unit_id)
    no v2.2 features depend on Battle Log

Wishlist / To-Buy
    optionally links──> Factions (faction_id on wishlist_items)
    optionally links──> Army Lists (army_list_id — "I want this for my list")
    no v2.2 features depend on Wishlist

Hobby Goals
    reads from──> Units (status_painting, updated_at — auto-progress)
    optionally scoped to──> Factions
    enhances──> Painting Streak (if "log a session daily" becomes a goal type — optional)
    no v2.2 features depend on Goals

Hobby Velocity Tracker
    reads from──> Units (painting_percentage, status_painting, updated_at)
    reads from──> Painting Sessions (session_date, duration_minutes) [Phase 13 — shipped]
    standalone dashboard widget — no v2.2 features depend on it

Spend Over Time Chart
    reads from──> Units (purchase_price_pence, purchase_date) [Phase 14 — shipped]
    reads from──> Paints (purchase_price_pence, created_at as proxy) [Phase 14 — shipped]
    DATA GAP: paints have no purchase_date; created_at is the fallback

Painting Streak
    reads from──> Painting Sessions (session_date) [Phase 13 — shipped]
    requires Hobby Journal to be shipped (it is — v2.1)
    optionally enhances──> Hobby Goals (daily session goal type)

Ready-to-Play Quick View
    reads from──> Units (painting_percentage, points, faction_id)
    enhances──> Army List Builder (optional "create list from these units" action)
    no v2.2 features depend on Ready-to-Play

Showcase Mode
    reads from──> Units (painting_percentage, name, faction_id, lore[if available])
    reads from──> Image Assets (file_path, entity_type='unit') [Phase 13 — shipped]
    soft-enhances──> Custom Lore Notes (lore as subtitle — optional; showcase works without it)

Custom Lore Notes
    extends──> Units (new lore TEXT column)
    extends──> Factions (new lore TEXT column)
    soft-enhances──> Showcase Mode (lore subtitle — optional coupling)

Undercoat Log
    extends──> Units (new undercoat_name, undercoat_method, undercoat_paint_id columns)
    optionally links──> Paints (FK: undercoat_paint_id — differentiator, not table stakes)
    no v2.2 features depend on Undercoat Log
```

### Dependency Notes

- **Battle Log requires Army List Builder (already shipped):** The army_list_id FK is
  the core connection. The log form must let the user pick which army list was played.
  Army List Builder shipped in v2.0 Phase 8.

- **Painting Streak and Hobby Velocity both require Hobby Journal (already shipped):**
  Both read from `painting_sessions`. Without session data, streak = 0 and velocity is
  unit-count-only. Hobby Journal shipped v2.1 Phase 13.

- **Spend Over Time Chart has a known data gap:** Paints have `purchase_price_pence`
  but no `purchase_date`. Chart for paint spend uses `created_at` as proxy. Requirements
  must decide: accept the proxy, or add `purchase_date TEXT` to paints in v2.2 migration.

- **Showcase Mode soft-depends on Hobby Journal images:** Units with no photos show
  nothing useful. The query must only return units with at least one image_asset.

- **Custom Lore Notes and Showcase Mode have optional synergy:** If lore is shipped
  first (it should be — LOW complexity), showcase can show lore as a subtitle. This
  coupling must be designed as optional (null-safe).

- **Undercoat Log has no hard v2.2 dependencies.** It is self-contained.

---

## Phasing Implications for Roadmap

Features group naturally by complexity and schema impact:

**Group A — Zero schema change, pure computation + UI widget (fast wins):**
- Hobby Velocity Tracker (dashboard widget or analytics section)
- Painting Streak (dashboard widget)
- Spend Over Time Chart (new chart on Spending Tracker page or Analytics page)
- Ready-to-Play Quick View (filter view on existing collection)

Group A features can ship in a single phase together — they share no dependencies on
each other and all read from already-shipped data.

**Group B — Additive column migrations only (ALTER TABLE, fast):**
- Custom Lore Notes (lore TEXT on units + factions — 2 columns)
- Undercoat Log (3 columns on units)

Group B features could ship together. They involve new UI surfaces (textarea in existing
sheets) but no new pages or routes.

**Group C — New table + CRUD page (medium effort):**
- Battle Log (schema exists — UI only; could be Group A in terms of schema)
- Wishlist / To-Buy (new table + CRUD page + promote action)
- Hobby Goals (new table + progress computation + UI)

Battle Log is a new full page even though no schema migration is needed. Wishlist and
Goals both need new tables. These are the most involved features.

**Group D — New page with complex UX:**
- Showcase Mode (full-screen gallery, keyboard nav, optional fullscreen API, image query)

Showcase Mode depends on Custom Lore Notes being available (for subtitle), so Group B
should ideally ship before or concurrently with Group D.

**Recommended phase order:**
1. Group A: Analytics widgets (Velocity, Streak, Spend Chart, Ready-to-Play) — all reads
2. Group B + Battle Log: Schema additions + Battle Log page (Battle Log is UI-only schema;
   Custom Lore and Undercoat are schema-only UI additions — group them)
3. Group C minus Battle Log: Wishlist + Hobby Goals (both need new tables)
4. Group D: Showcase Mode (polish phase; benefits from lore being live)

---

## Data Gaps to Flag for Requirements

1. **Paint purchase date missing:** `paints` has `purchase_price_pence` but no
   `purchase_date`. Spend Over Time Chart for paint spend must use `created_at` as a
   proxy. Requirements must decide: (a) accept the proxy with a displayed disclaimer, or
   (b) add `purchase_date TEXT NULL` to paints in v2.2 migration 007.

2. **Painting status change timestamp:** `units.updated_at` fires on ANY field change,
   not only painting status changes. Hobby Goals auto-progress (count units painted within
   period) uses `updated_at` as the painting completion date — this is approximate.
   Requirements must decide: (a) accept the approximation, or (b) add
   `painting_completed_at TEXT NULL` to units for precision.

3. **Session date vs datetime:** `painting_sessions.session_date` is stored as TEXT.
   Painting Streak computation assumes one date = one day of activity (YYYY-MM-DD format).
   Requirements must confirm that session_date stores date-only strings, not datetime
   strings, to avoid timezone edge cases in streak calculation.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Schema Change | Priority |
|---------|------------|---------------------|---------------|----------|
| Painting Streak | HIGH | LOW | None | P1 |
| Custom Lore Notes | HIGH | LOW | 2 ALTER TABLE | P1 |
| Undercoat Log | HIGH | LOW | 3 ALTER TABLE | P1 |
| Ready-to-Play Quick View | HIGH | LOW | None | P1 |
| Spend Over Time Chart | MEDIUM | LOW | None (or +1 col) | P1 |
| Hobby Velocity Tracker | HIGH | LOW | None | P1 |
| Battle Log | HIGH | MEDIUM | None (exists) | P1 |
| Wishlist / To-Buy | MEDIUM | MEDIUM | New table | P2 |
| Hobby Goals | MEDIUM | MEDIUM | New table | P2 |
| Showcase Mode | MEDIUM | MEDIUM | None | P2 |

**Priority key:**
- P1: Fast to ship, high value, or no schema risk — target early phases
- P2: New tables or complex UI — target mid-to-late phases

---

## Competitor Feature Comparison

| Feature | Tabletop Battles | Liber Pigmenta | Pile of Potential | HobbyForge v2.2 Approach |
|---------|-----------------|----------------|-------------------|--------------------------|
| Battle Log | Full live-game scoring + stats | No | No | Post-game log; schema already exists |
| Wishlist | No | No | No explicit wishlist | New table with promote-to-collection |
| Hobby Goals | No | No | No | New table; auto-progress from unit data |
| Velocity / pile projection | No | Army progress % | Progress % only | Auto-calculated from painting_sessions |
| Spend trend chart | No | No | Model count only | Monthly bar chart from existing pence data |
| Painting Streak | No | No | No | Consecutive day count from painting_sessions |
| Ready-to-Play filter | No | Battle-readiness % | Painted % | Painting threshold + points limit filter |
| Showcase Mode | No | No | No | Full-screen gallery — unique in local-first hobby apps |
| Custom Lore notes | No | No | Project notes | Per-unit and per-faction free text |
| Undercoat Log | No | Partial (primer step in recipe) | No | Per-unit field; optional FK to paint inventory |

---

## Sources

- Tabletop Battles app (tabletopbattles.com via goonhammer.com/ttba) — battle log
  field patterns, game tracking UX, win rate stats
- BattleBase.app — competitive Warhammer game tracking, roster + battle manager
- Liber Pigmenta (liberpigmenta.com) — miniature painting UX: Kanban, army manager,
  painting mode, streak concept
- Pile of Potential (wargamer.com review) — pile-of-shame tracking, progress summaries,
  project organization
- ServoCrypt (alpha.servocrypt.com) — per-unit lore, narrative campaign tracking,
  battle records
- Smashing Magazine: "Designing A Streak System" (2026-02) — streak UX and psychology
- shadcn/ui chart docs (ui.shadcn.com/docs/components/chart) — Recharts v3 bar chart
  patterns; confirmed Recharts v3 is the default in shadcn/ui
- HobbyForge migration 001_core_schema.sql — confirmed existing battle_logs table schema
- HobbyForge migration 005_hobby_journal.sql — confirmed painting_sessions schema
- HobbyForge migration 006_spend_pence.sql — confirmed purchase_price_pence on units/paints
- PROJECT.md v2.2 — confirmed out-of-scope constraints (rules validation, network, export)

---

*Feature research for: HobbyForge v2.2 — Full Circle*
*Researched: 2026-05-04*
