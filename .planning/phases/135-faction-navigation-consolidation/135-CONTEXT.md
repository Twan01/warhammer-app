# Phase 135: Faction & Navigation Consolidation - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

> ⚙️ Captured in `--auto` mode: gray areas auto-selected, recommended option chosen for each.
> All decisions below are the recommended defaults — review before planning if you disagree.
> The structural interpretation of HON-05 (D-01) is the single most important call here — read it first.

<domain>
## Phase Boundary

Third **Theme B (Honesty & De-cruft)** phase. Faction management currently lives in **two** places — the standalone `/factions` page (user-created collection factions with theming) and the `/unit-database` browser (canonical `udb_factions`) — and the sidebar carries a redundant `Factions` destination plus a `Data Health` destination that belongs in Settings. This phase makes faction management **one coherent home** with **zero data loss**, and trims the sidebar.

Three deliverables:

1. **HON-05 — map-not-delete faction consolidation (the data-loss trap).** A migration consolidates user collection factions so every one is aligned to the canonical Unit Database faction model, **merging redundant/duplicate faction rows by re-pointing their FK references first, then deleting only the now-orphaned duplicate row** — never deleting a faction that still has dependents. Every FK reference is preserved: `units` (RESTRICT), `painting_recipes` (SET NULL), `army_lists` (SET NULL), `wishlist_items` (CASCADE), and the `default_faction_id` theming setting. Zero data loss is *verified*.
2. **HON-06 — retire `/factions`.** Remove the standalone `/factions` sidebar page and route; faction list/edit/delete/theming remains reachable from its new home with no loss of capability. (Create is already independently reachable via the sidebar Quick Add "Add Faction".)
3. **HON-07 — demote Data Health.** Remove the `Data Health` entry from the main sidebar; reach it from **Settings → Data** (where an "Open Data Health" card already exists).

**In scope:**
- One numbered data migration (next is **048**) performing the map-not-delete consolidation, run in a transaction.
- A data-layer test (better-sqlite3, mirroring the existing migration-parity suite) proving zero data loss across all five FK surfaces.
- Removing the `/factions` route + sidebar item and rehoming faction list/edit/delete/theme management.
- Removing the `Data Health` sidebar item.
- Updating the migration/version parity counters that migration 048 trips (Phase 130 gate).

**Out of scope (own phases / preserve):**
- **No FK column-type rewrite.** Do NOT migrate the integer `factions.id` PK or any `faction_id` FK to the canonical TEXT `udb_factions.id`. The collection `factions` table remains the themed, integer-PK ownership layer aligned *to* canonical via `wahapedia_faction_id` (D-02). Rewriting five FK columns from INTEGER→TEXT is unacceptable risk for a zero-data-loss requirement.
- Shared/army abilities and Link-unit dead ends — Phase 134 (HON-03/04, done).
- WeaponTable dedup / ArmyListDetailPage decomposition — Phase 136.
- `udb_leader_targets` migration — Phase 137 (the *next* intentional schema migration; 135's 048 is a data-only consolidation migration).

</domain>

<decisions>
## Implementation Decisions

### HON-05 — what "consolidate into the canonical model" means (structural)
- **D-01:** *(recommended default — review)* "Consolidate user factions into the canonical faction model" = **align + dedup the collection `factions` table to canonical**, NOT replace it. Concretely: (a) every collection faction must end up mapped (`wahapedia_faction_id` non-NULL) to a `udb_factions` row; (b) where multiple collection faction rows map to the **same** canonical faction (duplicates), merge them into one surviving row. The canonical `udb_factions` is the identity source of truth; the collection `factions` row is its themed projection (color, default-faction theming, ownership).
- **D-02:** **Keep the integer-PK `factions` table and all existing `faction_id` FKs unchanged in type.** Consolidation re-points *which row* a FK targets; it never changes the *column type*. This preserves theming, the `default_faction_id` setting, and the entire query layer.
- **D-03:** **Map-not-delete order (the safety contract).** For each merge: (1) pick the survivor (the canonical-aligned row); (2) **re-point every dependent FK** from the duplicate to the survivor — `units.faction_id`, `painting_recipes.faction_id`, `army_lists.faction_id`, `wishlist_items.faction_id`, and the `default_faction_id` app_settings value if it pointed at the duplicate; (3) **only then DELETE the now-zero-dependency duplicate row**. Never `DELETE` a faction with live dependents (units would RESTRICT-block, army_lists/recipes would SET NULL = silent link loss, wishlist would CASCADE = silent item loss). The re-point step is what makes the delete safe.
- **D-04:** **Unmapped factions are mapped, not deleted.** A still-NULL `wahapedia_faction_id` faction (one normalized name-matching in 039/046 never resolved) is *mapped* if a canonical match can be established, otherwise left intact and untouched (kept, not dropped). No collection faction with dependents is ever destroyed.

### HON-05 — verification (zero data loss is the acceptance bar)
- **D-05:** **Data-layer test, mirroring the existing parity suite.** Add a better-sqlite3 test under `tests/data-layer/` that seeds duplicate collection factions each carrying dependents across **all five surfaces** (a unit, a recipe, an army_list, a wishlist_item, and `default_faction_id` pointing at a duplicate), runs migration 048, then asserts: every unit still resolves a faction; `army_lists`/`painting_recipes` faction links are preserved (no NULLs introduced); `wishlist_items` row count is unchanged; `default_faction_id` still resolves to a live faction; total dependent-row counts are identical before/after.
- **D-06:** **Cold-boot theming check.** Verification must confirm theming still loads cold — `ActiveFactionContext` resolves `default_faction_id` → a live faction → its `color_theme` → `--faction-accent` — after consolidation. (The default-faction value must be re-pointed if its target row was merged away.)

### HON-06 — new home for faction management
- **D-07:** *(recommended default — review)* The new coherent home for faction **list / edit / delete / theme** is **Settings**, as a dedicated "Factions" management section (alongside the existing `DefaultFactionSetting` in Preferences and `DataManagementTab` in Data). Rationale: Settings is the established configuration home, faction theming/default already lives there, and it avoids loading CRUD into the read-oriented Unit Database browser. **Create** stays reachable via the existing sidebar **Quick Add → "Add Faction"** (unaffected by route removal), so no capability is lost.
- **D-08:** **Reuse the existing faction components verbatim.** `FactionSheet` (create/edit + color picker), `FactionDeleteDialog` (FK-aware delete), `FactionCard`/`FactionRow`, and `FactionsEmptyState` move to the new home unchanged — this is a rehoming, not a rebuild. Delete the `/factions` route, `factionsRoute`, the `FactionsPage`/`page.tsx` wrapper, and the sidebar `Management` nav entry for it.

### HON-07 — Data Health placement
- **D-09:** *(recommended default — review)* **Minimal demotion: remove the sidebar entry only; keep the `/data-health` route.** The Settings → Data tab already renders an "Open Data Health" card linking to `/data-health` — that satisfies "moved into Settings → Data" without inlining the whole diagnostics page. Remove the `Data Health` item from `MANAGEMENT_NAV` in `AppSidebar.tsx`; keep `dataHealthRoute` for the Settings card and any deep links.

### Cross-cutting — migration parity gate
- **D-10:** Migration **048** is a new `src-tauri/migrations/*.sql` file, so it **trips the Phase-130 release gate**: the data-layer migration list now self-derives from disk (no manual list edit needed), but `lib.rs` `Migration{}` count must be incremented to match, and the `pnpm check:version` three-leg gate (version parity + migration count + CR-byte scan) must pass. Ensure the file has **LF line endings** (no CR bytes) or the gate fails. No `package.json`/`tauri.conf.json` version bump is required by this phase unless shipping.

### Claude's Discretion
The exact placement of the Factions section within Settings (new tab vs. a card under Preferences/Data), the precise survivor-selection rule when two duplicates are both mapped (e.g. lowest id, or the one with most dependents), the SQL shape of the re-point (correlated UPDATEs vs. a temp mapping table), whether to disable FK enforcement during the delete pass (mirroring the `bulk_sync_rules` pattern in `lib.rs`) vs. ordering deletes after re-points, and the empty-state copy are the planner/executor's call — provided: zero data loss is verified across all five FK surfaces (D-05), the integer-PK/FK architecture is unchanged (D-02), faction management remains fully reachable (D-07/D-08), and `pnpm build` + `pnpm test` are green.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 135: Faction & Navigation Consolidation" — goal + 3 success criteria (authoritative acceptance bar); `**UI hint**: yes`; the **Notes** line warning that HON-05 is the data-loss trap and must NOT be bundled with the route removal in a way that risks data.
- `.planning/REQUIREMENTS.md` — HON-05, HON-06, HON-07 (full requirement text); Theme B context.
- `.planning/phases/134-no-dead-ends/134-CONTEXT.md` — prior Theme B phase (depends-on); establishes the `wahapedia_faction_id` mapping pattern and `updateFaction` partial-update.
- `.planning/phases/130-migration-parity-release-gate/130-CONTEXT.md` — the release-gate mechanics migration 048 must satisfy (D-10).

### HON-05 — faction schema & FK surfaces
- `src-tauri/migrations/001_core_schema.sql` — `factions` table (integer PK, `color_theme`, `id`); `units.faction_id … RESTRICT` (line ~22); `painting_recipes.faction_id … SET NULL` (line ~69); `army_lists.faction_id … SET NULL` (line ~105).
- `src-tauri/migrations/009_wishlist.sql` — `wishlist_items.faction_id … ON DELETE CASCADE` (line 5) — the silent-data-loss risk if a faction with wishlist items is deleted before re-point.
- `src-tauri/migrations/039_collection_udb_link.sql` — adds `factions.wahapedia_faction_id` (line 12) + initial name-match backfill.
- `src-tauri/migrations/046_backfill_faction_udb_normalized.sql` — normalized re-backfill (strips spaces/apostrophes); the current state of mapping — read to understand which factions may still be NULL.
- `src-tauri/migrations/038_udb_schema.sql` — `udb_factions` (TEXT id, `name`, `short_name`) — the canonical model factions consolidate toward.
- `src-tauri/migrations/044_app_settings.sql` — `app_settings` key/value store; `default_faction_id` is a stored integer value with **no FK** — must be manually re-pointed if its target row is merged away.
- `src-tauri/migrations/033_database_hardening.sql` — existing `faction_id` indexes (units/recipes/army_lists/wishlist) to be aware of during the re-point.
- `src-tauri/src/lib.rs` — `Migration{}` array (count must increment for 048, D-10) and the `bulk_sync_rules` FK-disable-during-delete pattern (a reference for safe bulk deletes).
- `tests/data-layer/migration-parity.test.ts` — the disk-derived migration-list test (auto-picks up 048) and the better-sqlite3 harness pattern D-05's new test should mirror.

### HON-05/06 — query & hook layer
- `src/db/queries/factions.ts` — `getFactions`, `getFactionById`, `createFaction`, `updateFaction` (COALESCE partial update incl. `wahapedia_faction_id`), `deleteFaction` (throws on FK).
- `src/hooks/useFactions.ts` — `FACTIONS_KEY`, `useFactions`/`useFaction`, and `useDeleteFaction`'s cascade invalidations (`dashboard-stats`, `army-readiness`, `spending-stats`, `recipes`, `army-lists`, `wishlist-items`) — the same caches affected by consolidation.
- `src/context/ActiveFactionContext.tsx` — cold-boot theming path (D-06): `default_faction_id` → faction → `color_theme` → `--faction-accent` CSS var; localStorage `active-faction-id`.

### HON-06 — /factions page & rehoming
- `src/app/factions/page.tsx` + `src/features/factions/FactionsPage.tsx` — the page to retire.
- `src/features/factions/FactionSheet.tsx`, `FactionDeleteDialog.tsx`, `FactionRow.tsx` (FactionCard), `FactionsEmptyState.tsx`, `factionSchema.ts` — components to **rehome unchanged** (D-08).
- `src/app/router.tsx` — `factionsRoute` (path `/factions`, line ~101–103, registered ~235) and the `FactionsPage` lazy import (line ~26) to remove; `dataHealthRoute`/`DataHealthPage` (lines ~35, ~204) to KEEP.
- `src/features/settings/DefaultFactionSetting.tsx` + `GeneralPreferencesSection.tsx` + `src/app/settings/page.tsx` — the Settings home D-07 extends; `DefaultFactionSetting` reads/writes `default_faction_id`.

### HON-06/07 — sidebar
- `src/components/common/AppSidebar.tsx` — `MANAGEMENT_NAV` array (line ~57–62) containing the `Factions` (`/factions`, ~line 58) and `Data Health` (`/data-health`, ~line 61) items to remove; the `Quick Add → "Add Faction"` menu (lines ~117–120) that KEEPS faction creation reachable.

### HON-07 — Settings → Data
- `src/features/settings/DataManagementTab.tsx` — the "Open Data Health" card (lines ~162–183) that already links to `/data-health`; this is the satisfying entry point for D-09.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The entire `src/features/factions/` component set (`FactionSheet` with color picker, `FactionDeleteDialog` with FK-error detection, `FactionCard`, `FactionsEmptyState`) is reusable as-is — HON-06 is a rehoming, not a rebuild.
- `updateFaction` already does COALESCE partial updates including `wahapedia_faction_id`, so mapping unmapped factions (D-04) needs no new query.
- The Settings → Data tab already contains an "Open Data Health" card → HON-07 is mostly a sidebar-item deletion (D-09).
- The data-layer test harness (`tests/data-layer/`, better-sqlite3) is the established pattern for the zero-data-loss proof (D-05); the migration-parity test already self-derives the migration list from disk, so 048 is picked up without a manual edit.
- Sidebar Quick Add already creates factions independently of `/factions`, so route removal doesn't strand the create flow.

### Established Patterns
- Faction→canonical resolution is by stored `wahapedia_faction_id` (TEXT), set by normalized name match in migrations 039/046 — duplicates/unmapped rows are the consolidation targets.
- Single `hobbyforge.db`, integer-PK collection tables, `$1/$2` parameterized queries; `PRAGMA foreign_keys = ON` per connection — the re-point/delete order (D-03) matters precisely because FK enforcement is on.
- `lib.rs` `bulk_sync_rules` disables FK checks during a bulk delete pass inside one transaction — a reference pattern if the planner chooses FK-disable over strict re-point-then-delete ordering.
- Adding any `src-tauri/migrations/*.sql` trips the Phase-130 parity gate (lib.rs count + version parity + CR-byte scan).

### Integration Points
- Migration 048 (data-only) → `factions` table re-point + dedup → must preserve `units`/`painting_recipes`/`army_lists`/`wishlist_items`/`default_faction_id`.
- `lib.rs` `Migration{}` count ↔ migration file count ↔ data-layer migration list (parity gate).
- `AppSidebar.MANAGEMENT_NAV` → remove two items; `router.tsx` → remove `/factions`, keep `/data-health`.
- New Settings "Factions" section ← rehomed `src/features/factions/*` components, wired through the existing `useFactions`/`useUpdateFaction`/`useDeleteFaction` hooks.

</code_context>

<specifics>
## Specific Ideas

- The honest test for HON-05: seed a DB with two collection faction rows that map to the **same** canonical faction, each owning a unit + recipe + army_list + wishlist_item, with `default_faction_id` pointing at the one about to be merged; after migration 048, **every count is identical**, no FK is NULLed, and the default-faction theming still resolves on cold boot. A wishlist count that drops by even one = CASCADE fired before a re-point = bug.
- The honest test for HON-06: after deleting `/factions`, a user can still find the faction list, edit a name/color, delete an (empty) faction, and create a new one — all without the old page. No greyed-out or vanished capability.
- The honest test for HON-07: `Data Health` is gone from the sidebar but reachable in ≤2 clicks via Settings → Data → "Open Data Health".
- **Watch the painting_sessions wording:** the success criterion lists "painting_sessions", but the direct `faction_id` FK is on `painting_recipes` (SET NULL), not `painting_sessions` (which links to recipes/units). Researcher: confirm whether `painting_sessions` carries any faction reference at all, or whether the criterion means painting_recipes; treat `painting_recipes` as the in-scope SET-NULL surface.

</specifics>

<deferred>
## Deferred Ideas

- Migrating the collection `faction_id` FKs from INTEGER→canonical TEXT ids (a "true" single-faction-model unification) — deliberately rejected here (D-02) as unacceptable risk for a zero-data-loss phase; would be its own large, separately-justified phase if ever pursued.
- Folding the full Data Health diagnostics UI *inline* into the Settings → Data tab (vs. the link-card kept by D-09) — a polish option for a later UX phase, not required by HON-07.
- WeaponTable dedup / ArmyListDetailPage decomposition — Phase 136.
- `udb_leader_targets` canonical leader-attachment migration — Phase 137.

None blocking — discussion stayed within the HON-05/06/07 boundary.

</deferred>

---

*Phase: 135-faction-navigation-consolidation*
*Context gathered: 2026-06-17*
