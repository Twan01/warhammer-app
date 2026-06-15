# Feature Research

**Domain:** Warhammer 40K 10th-edition hobby-management desktop app (single-user, local-first) — v0.6.0 Themes C (Player-Journey Depth) & B (Honesty & De-cruft)
**Researched:** 2026-06-15
**Confidence:** HIGH (leader-attachment data structure verified against live Wahapedia CSV; existing-feature behavior verified by reading source; comparison/discovery patterns MEDIUM from ecosystem survey)

> Supersedes the prior v0.4.7-era FEATURES.md (rules-data import landscape), which is no longer the active research scope.

---

## Critical Pre-Findings (verified against codebase + live data)

Three findings reshape the scope estimates below. Read these first.

1. **Leader-attachment data ALREADY exists, structured, in Wahapedia.** Wahapedia ships a dedicated `Datasheets_leader.csv` with the schema `leader_id|attached_id` — **1,918 canonical leader→target pairs** (verified live, 2026-06-15). This is NOT prose to be parsed out of ability text; it is a clean join table. Because `udb_units` reuse Wahapedia string datasheet IDs (Key Decision: "Reuse Wahapedia string IDs for udb_units"), both columns map directly to `udb_units.id`. This collapses "full leader-attachment validation" from a HIGH-complexity NLP problem to a MEDIUM data-pipeline + join task.

2. **A leader-target data layer already exists but is fed by the removed BSData source.** `src/hooks/useLeaderTargets.ts`, `getLeaderTargetsByFaction()` in `src/db/queries/bsdataExtended.ts`, the `synced_leader_targets` table, and `LeaderAttachmentSheet.tsx` were all built in Phase 92. They match leaders to targets by **name string** (`leader_name`/`target_name`, case-insensitive). Since BSData was eliminated (v0.4.7), `synced_leader_targets` is almost certainly **empty** — the current "validation" silently degrades to "no valid targets," which is why the milestone calls the existing approach "guidance-only." The work is: repoint this layer at the canonical UDB (FK-based, by `udb_unit_id`, not by name).

3. **The "fake sync" surface is already a known stub.** `src/lib/syncFreshness.ts` hardcodes `getSyncFreshness() → "fresh"` and `getSyncAgeLabel() → "Data bundled with app"` with a comment that 12 consumers depend on the type. `StaleDataBanner.tsx` still renders. Theme B's honesty work is removing/replacing these, not building new freshness logic.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Leader-attachment validation against canonical targets** | 10th-ed core rule: a Leader can only attach to the specific Bodyguard units listed on its datasheet. A list builder that lets you attach a Captain to a Land Raider is wrong. | MEDIUM | Add `Datasheets_leader.csv` to the download list + build pipeline; emit a `udb_leader_targets(leader_unit_id, attached_unit_id)` table; migrate `useLeaderTargets`/`LeaderAttachmentSheet` from name-match on `synced_leader_targets` to FK-join on `udb_unit_id`. Data already verified (1,918 pairs). |
| **Honest data-status surface (no fake "sync")** | A "Last synced 3 days ago / Stale" banner on data that ships with the app and never syncs is a lie that erodes trust. Users expect status to reflect reality. | LOW | Replace `StaleDataBanner` + the freshness stubs with a static, truthful "Game data version X (bundled with app v0.6.0)" indicator. See Theme-B section below. |
| **"You own N of this" on the canonical catalog** | Any catalog backed by an inventory shows ownership inline. Browsing the Unit Database without seeing what you already own forces context-switching. | LOW–MEDIUM | Reverse of the existing `units.udb_unit_id` FK. Count owned `units` rows grouped by `udb_unit_id`; surface a badge on `UdbDatasheetSheet` / unit-database rows. Collection→DB link already exists (v0.5.2 "View Datasheet"); this is the missing return leg. |
| **Add-from-catalog into collection** | Already partially built (v0.4.0 COL-01 "Add from Database"). Expected to be reachable from the catalog itself, not only from the collection page. | LOW | Surface the existing add-flow as an action on the datasheet view (catalog → collection direction of the loop). |
| **Goal progress visible where the user already looks (dashboard)** | Goals invisible unless you visit `/goals` get forgotten. Habit/hobby trackers universally surface progress on the home screen. | LOW–MEDIUM | A dashboard card existed historically (v0.2.2 "dashboard goal card") but PROJECT notes goals now have "no dashboard surfacing, no progress viz." Re-surface active goals with a progress bar + due-date awareness on the command-center grid. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Side-by-side unit comparison (2–3 datasheets)** | "Which of these two HQs should I run / paint next?" answered without tab-switching. For a painter→collector, comparison is about *informed choice and learning the roster*, not mathhammer. | MEDIUM | New `/unit-database` sub-view or modal. Align rows: stats line (M/T/Sv/W/Ld/OC), weapon profiles, abilities, keywords, points-by-model-count. All data already in `udb_*` tables. Pick units from the existing browser (multi-select). 2–3 is the right cap for a desktop column layout; competitive tools go to 4 but add clutter. |
| **Comparison that highlights deltas** | Showing *what differs* (e.g. T5 vs T4, +1 OC) is far more useful than two static blocks side-by-side. | MEDIUM | Diff-highlight numeric stats and list-difference keywords/abilities. This is the "makes it useful for list-building decisions" piece. Pure presentation layer over existing data. |
| **Closed-loop Collection ⇆ Unit Database discovery** | The bidirectional loop (own→catalog→own) turns the catalog from a reference into a *planning surface* tied to real ownership. | MEDIUM (sum of the two LOW table-stakes legs + polish) | Catalog row: "Owned ×2 · View in Collection" / "Not owned · Add to Collection". Collection row: "View Datasheet" (exists). The differentiation is making it feel like one connected space, not two lists. |
| **Goal progress derived from real hobby data** | Goals tied to painting sessions/readiness auto-advance — no manual check-off. A dashboard card showing "Paint 1000 pts of Necrons: 640/1000 ✓ on track" is uniquely satisfying for this app's loop. | MEDIUM | Progress derivation likely already partially exists (v0.2.2 "track progress via painting sessions"). Verify it still computes post-rules.db-elimination; add visualization (progress ring/bar, due-date pacing). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Mathhammer / damage-efficiency comparison (Dmg-per-100pts, win-probability)** | Competitive 40K tools (Tactical Cogitator, UnitCrunch) lead with it; tempting to match. | Directly contradicts the stated journey ("painter/collector → ready-to-play, NOT competitive optimization") and Out-of-Scope ("Competitive list optimization"). Requires a combat simulation engine — huge, perpetually-maintained, off-mission. | Comparison shows *facts* (stats, weapons, abilities, points), not *simulated outcomes*. Let the user draw conclusions. |
| **Full rules-legality army validation (FOC slots, detachment limits, enhancement caps, max-units-per-datasheet)** | "Validate my list" sounds like a natural extension of leader validation. | Out-of-Scope ("rules validation explicitly not the goal"). 10th-ed composition rules are intricate and change with every Munitorum/dataslate; a half-correct validator is worse than none (false confidence). | Keep validation scoped to leader-attachment *targeting* (a stable, datasheet-level fact) plus the existing soft warnings (points over budget, ownership, readiness). Don't expand into list-legality. |
| **Comparing 4+ units / arbitrary multi-select grid** | "Why not let me compare my whole faction?" | Desktop columns become unreadable past 3; comparison stops being a decision aid and becomes a worse version of the database table that already exists. | Cap at 2–3. The full-roster view is the existing Unit Database browser with filters. |
| **Auto-sync / "check for data updates" button next to the data-status surface** | Once you show a data version, users expect a refresh button. | Out-of-Scope ("Runtime auto-sync of unit data — offline-first; updates via app releases"). Adds a network surface the architecture deliberately removed (rules.db elimination). | The honest status says data ships with the app; updates arrive via app releases (auto-update already exists). No runtime fetch. |
| **Goal types beyond hobby progress (tournament placement, win-rate goals)** | Goals feature could absorb competitive metrics. | Off-mission; pulls the app toward competitive tracking. | Keep goals tied to the painting/collecting loop (points painted, units finished, projects completed). |
| **Editable/override leader-target pairs in the UI** | "Wahapedia is missing X" or homebrew. | Maintenance burden + correctness risk for a single-user tool; the manual-override system exists for points/stats but leader targeting is rarely wrong in the source. | Trust the canonical data. If a gap is found, fix it in the pipeline (Theme D territory), not via per-user UI overrides. |

---

## Feature Dependencies

```
Theme B (Honesty) — independent, no data deps
  └── Remove StaleDataBanner + freshness stubs ──> replace with bundled-data version surface
  └── (other B items: Shared Abilities tab, Link-unit dead end, Factions merge, decomposition)

Theme C (Player-Journey Depth)
  Unit comparison view
      └──requires──> existing udb_* tables (DONE) + Unit Database browser multi-select (new)

  Leader-attachment validation (canonical)
      └──requires──> Datasheets_leader.csv in download + build pipeline (new)
                         └──produces──> udb_leader_targets table (new migration)
      └──requires──> repoint useLeaderTargets / LeaderAttachmentSheet from
                     synced_leader_targets (name-match, BSData-fed, empty)
                     to udb_leader_targets (FK by udb_unit_id)
      └──enhances──> existing army-list builder leader attachment (Phase 92 UI reused)

  Collection ⇆ Unit Database discovery loop
      └──requires──> units.udb_unit_id FK (DONE, v0.4.0)
      └──requires──> reverse count query "owned N by udb_unit_id" (new)
      └──enhances──> existing Collection→Datasheet link (DONE, v0.5.2)

  Goals on dashboard
      └──requires──> goal progress derivation from sessions (likely DONE, v0.2.2 — VERIFY)
      └──requires──> dashboard grid slot (DONE, CSS grid command center)
```

### Dependency Notes

- **Leader validation requires the pipeline change first.** `Datasheets_leader.csv` must be added to `scripts/download-wahapedia.ts` (`CSV_FILES`) and `scripts/build-unit-db.ts`, producing a new bundled table. The UI rewire (name-match → FK-join) depends on that data existing. Clean two-step: pipeline → query/UI.
- **The comparison view and discovery loop share the Unit Database surface** but are otherwise independent and can ship in either order.
- **Goals-on-dashboard depends on verifying progress derivation still works** post-rules.db-elimination. If derivation broke, that's a prerequisite fix before visualization.
- **Theme B is fully independent of Theme C** and (per the A→B→C→D sequencing) should land first. None of the honesty/de-cruft items block the depth features.

---

## MVP Definition

### Launch With (v0.6.0 core — Themes B & C as scoped)

- [ ] **Honest data-status surface** — remove `StaleDataBanner` + freshness stubs, replace with truthful bundled-version indicator. *Highest trust value, lowest cost.*
- [ ] **Leader-attachment validation against canonical `Datasheets_leader.csv`** — pipeline + `udb_leader_targets` + rewire existing Phase-92 UI from name-match to FK. *Core 10th-ed correctness; data already verified to exist.*
- [ ] **Collection ⇆ Unit Database loop** — "Owned ×N" badge + "View in Collection" on catalog; "Add to Collection" reachable from datasheet. *Completes a half-built loop.*
- [ ] **Side-by-side unit comparison (2–3 units, facts-only)** — multi-select in browser, aligned rows, delta highlighting. *The flagship Theme-C differentiator.*
- [ ] **Goals on the dashboard** — active goals with progress bar + due-date awareness on the command-center grid. *Re-surfaces an existing-but-buried feature.*

### Add After Validation (v0.6.x)

- [ ] **Comparison "what's different" summary line** (one-line text diff above the columns) — add if column-level delta highlighting proves insufficient.
- [ ] **Comparison from army-list context** ("compare these two units I'm deciding between in this list") — trigger comparison from the list builder, not just the database.

### Future Consideration (later milestones)

- [ ] **Goal templates / suggested goals** ("paint a 1000-pt army") — defer until base goal-on-dashboard usage is observed.
- [ ] **Leader-attachment auto-suggest in the list builder** ("you have an unattached Captain and an eligible Intercessor squad") — defer; current explicit attach flow is sufficient.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Honest data-status surface (remove fake sync) | HIGH (trust) | LOW | P1 |
| Leader-attachment validation (canonical) | HIGH | MEDIUM | P1 |
| Collection ⇆ Unit Database loop | HIGH | LOW–MEDIUM | P1 |
| Side-by-side unit comparison (facts-only, 2–3) | MEDIUM–HIGH | MEDIUM | P1 |
| Goals on dashboard | MEDIUM | LOW–MEDIUM | P1/P2 |
| Comparison delta-highlighting | MEDIUM | LOW (over comparison base) | P2 |
| Comparison "what differs" summary | LOW–MEDIUM | LOW | P3 |
| Mathhammer comparison | — | HIGH | ANTI (do not build) |
| Full rules-legality validation | — | HIGH | ANTI (do not build) |

---

## Competitor / Ecosystem Feature Analysis

| Feature | Tactical Cogitator / UnitCrunch | Warhammer Oracle | New Recruit / BattleScribe | HobbyForge Approach |
|---------|-------------------------------|------------------|----------------------------|---------------------|
| Unit comparison | "Comparison Matrix" sorted by Dmg/100pts (competitive efficiency) | Side-by-side 2–4 units: full stats, weapons, abilities, keywords (informational) | List-level, not unit-comparison | **Follow Warhammer Oracle's facts-only model, capped at 2–3, with delta highlighting. Reject Cogitator's mathhammer framing** (off-mission). |
| Leader attachment | Implicit in list legality | N/A | Enforces attach legality at list-build time | **Validate targeting against canonical `Datasheets_leader.csv`; stop at targeting (not full FOC legality).** |
| Catalog ⇆ ownership | No ownership concept (calculators) | No ownership | No collection/ownership concept | **Unique to HobbyForge: ties canonical catalog to a real owned-inventory via `udb_unit_id` FK — the bidirectional loop is the differentiator.** |
| Data freshness | Live BSData import | Live | Live data packs | **Honest "bundled with app" status; no runtime sync (deliberate local-first stance).** |

**Takeaway:** the comparison and validation features have ecosystem precedent, but every mainstream 40K tool is *competitive-first*. HobbyForge's differentiation is keeping these features **informational and ownership-aware** for the painter/collector journey — exactly the boundary the Anti-Features section enforces.

---

## Theme B — Honest Offline-Data Status (deep dive)

**The problem:** `getSyncFreshness()` is hardcoded to `"fresh"`; `getSyncAgeLabel()` returns `"Data bundled with app"`; `StaleDataBanner.tsx` still renders a freshness-themed banner. PointsFreshnessBadge, ReadyToPlayCard, GameDayReadinessPanel, computeUnitWarnings, ArmyListSummaryBar, and DataHealthSummaryCard all consume the freshness type. The UI implies a sync mechanism that no longer exists.

**What a data-status surface SHOULD show (best practice for bundled offline data):**

1. **A truthful provenance statement, not a freshness clock.** Replace "Last synced / Stale" with "Game data: Wahapedia export, bundled with HobbyForge v0.6.0." Provenance + version is honest; an age timer is not (the data's age is the *app release's* age).
2. **A content version/identifier, not a timestamp.** The build already computes a content hash (`build-unit-db.ts` ~line 827: `createHash('sha256')...slice(0,8)`). Surface that hash or a human "data revision" so the user can tell *which* data they have. This is the honest analog of a sync date.
3. **An update path that matches reality.** "Newer game data ships in app updates" + link to the existing auto-update flow. No "Refresh" button (would imply runtime sync — Out-of-Scope).
4. **Remove freshness from per-unit/list warnings.** `computeUnitWarnings` / `PointsFreshnessBadge` should drop the "stale points" warning entirely — points can never be stale relative to a sync that doesn't happen. They can only be "newer in a future app release."

**Recommended teardown order:** delete `StaleDataBanner` + dead dashboard freshness branches → simplify the 12 consumers to drop freshness UI → replace `syncFreshness.ts` with a tiny `getDataProvenance()` returning `{ version, dataRevision }` → expose it in Settings → Data (where Data Health is being demoted per Theme B) and the About tab. Surgical: remove the lie rather than dress it up.

---

## Implementation Notes for Downstream (Requirements/Roadmap)

- **Reuse, don't rebuild, the leader UI.** `LeaderAttachmentSheet.tsx`, `groupUnitsWithLeaders.ts`, `useSetLeaderAttachment`/`useClearLeaderAttachment`, and the `leader_attached_to_id` column are all in place and work. The only change is the *source of truth* for valid targets: swap name-match-on-`synced_leader_targets` for FK-join-on-`udb_leader_targets`. Match on `udb_unit_id` (army-list units already carry it) instead of `unit_name` strings — eliminates the case-insensitive-name fragility flagged in Phase-92 pitfalls.
- **Pipeline change is small and verified.** Add `"Datasheets_leader.csv"` to `CSV_FILES` in `download-wahapedia.ts` and parse it in `build-unit-db.ts` into a `udb_leader_targets` array (both columns are Wahapedia datasheet IDs = `udb_units.id`). 1,918 rows confirmed live. Header is exactly `leader_id|attached_id`.
- **Comparison view has zero new data needs** — `udb_units`, `udb_models`, `udb_weapons`, `udb_unit_abilities`, `udb_keywords`, `udb_points_tiers` already hold everything. It is a pure presentation feature over the existing browser. Bilingual (EN/FR) display should reuse the existing COALESCE locale layer.
- **Verify goal progress derivation before building visualization.** PROJECT history shows goals tracked "via painting sessions" (v0.2.2) but current state says "no progress viz." Confirm the derivation query survives the rules.db elimination + recipe-progress changes; if not, that's a prerequisite.
- **The discovery-loop reverse query** ("owned N by udb_unit_id") is one `GROUP BY units.udb_unit_id` count — surface as a Map at the unit-database page level (the established "load once, Map via useMemo, no N+1" pattern from the codebase).

---

## Sources

- **Live Wahapedia export** — `https://wahapedia.ru/wh40k10ed/Datasheets_leader.csv` (header `leader_id|attached_id`, 1,918 rows; verified 2026-06-15 via direct fetch). HIGH confidence.
- **Wahapedia Data Export** — https://wahapedia.ru/wh40k10ed/the-rules/data-export/ (CSV export model; full spec in `Export Data Specs.xlsx`). HIGH.
- **10th-ed Leader/Bodyguard rule** — Bell of Lost Souls 10th-ed datasheet explainer; confirms Leaders attach only to datasheet-listed Bodyguard units: https://www.belloflostsouls.net/2023/04/warhammer-40000-10th-edition-datasheet-explainer.html — MEDIUM.
- **Comparison-view ecosystem** — Tactical Cogitator (Unit Comparison Matrix, Dmg/100pts): https://tactical-cogitator.com/ ; UnitCrunch (mathhammer): https://www.unitcrunch.com/ ; Warhammer Oracle (side-by-side 2–4 units, facts): https://glama.ai/mcp/servers/gregario/warhammer-oracle/inspect — MEDIUM.
- **Codebase verification (HIGH)** — `src/lib/syncFreshness.ts`, `src/features/army-lists/LeaderAttachmentSheet.tsx`, `src/hooks/useLeaderTargets.ts`, `src/db/queries/bsdataExtended.ts`, `src/lib/groupUnitsWithLeaders.ts`, `scripts/download-wahapedia.ts`, `scripts/build-unit-db.ts`, `.planning/PROJECT.md`.

---
*Feature research for: Warhammer 40K hobby-management desktop app (v0.6.0 Themes C & B)*
*Researched: 2026-06-15*
</content>
