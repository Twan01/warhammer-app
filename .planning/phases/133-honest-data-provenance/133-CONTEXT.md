# Phase 133: Honest Data Provenance - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

> ⚙️ Captured in `--auto` mode: gray areas auto-selected, recommended option chosen for each.
> All decisions below are the recommended defaults — review before planning if you disagree.

<domain>
## Phase Boundary

This is the first **Theme B (Honesty & De-cruft)** phase. It removes the **fake sync/freshness UI** that lies to the user about data being "stale" or needing a "sync" — an architectural untruth, because rules.db was eliminated and all unit data now ships **bundled** in the app (Phase 107). The freshness machinery was stubbed to always return `"fresh"` but the dead "stale"/"aging" UI branches and the `StaleDataBanner` still exist as cruft.

Two requirements (HON-01, HON-02 — from ROADMAP success criteria):
1. **HON-01:** `StaleDataBanner` and the dead "stale points" dashboard branches are **removed**, replaced by an **honest data-provenance/version surface** (built from the app's own version/build identity — ideally a content hash) that states truthfully what data the build carries. **No UI offers a "sync" or "refresh data" action** (the deliberate offline architecture is preserved).
2. **HON-02:** All former consumers of the `syncFreshness` type **compile cleanly** (`pnpm build` green) with **no dead branches, dangling imports, or unused exports**.

**In scope:**
- Delete `src/lib/syncFreshness.ts` (the always-`"fresh"` stub) and `src/features/army-lists/StaleDataBanner.tsx` (already has zero importers — fully dead).
- Excise every `SyncFreshness` / `getSyncFreshness` / `getSyncAgeLabel` / `FRESHNESS_DOT_CLASS` reference from the ~8 consumer files, including the `freshness` parameter threaded through `computeUnitWarnings` / `WarningContext` / `computeListHealthStats`.
- Replace the removed surfaces with an **honest, static data-provenance label** (data version + build identity) wherever data identity is genuinely useful; drop the now-meaningless always-green "freshness" dots elsewhere.
- Verify no remaining UI text or action implies the user can/should "sync" or "refresh" bundled data.

**Out of scope (own phases / preserve):**
- The **real backup-staleness** warning (`src/lib/backupFreshness.ts` + its dot/label/version-mismatch UI) — that is genuine and must be **preserved untouched** (success criterion 3 explicitly forbids conflating it with the fake sync staleness).
- Shared Abilities tab, dead-end "Link unit", Factions/Data-Health consolidation — Phases 134–135.
- Any new DB migration / canonical-build schema change — deliberately avoided here (see D-02); the next intentional migration is Phase 137's `udb_leader_targets` (which re-triggers the parity gate by design).

</domain>

<decisions>
## Implementation Decisions

### Provenance source — what "content hash" the honest surface uses (HON-01)
- **D-01:** The honest provenance surface is built from the data identity **already present in `udb_meta`** — `version` (e.g. `v…`) + `built_at` — which `PointsFreshnessBadge` already renders as `v{version}` with a `built {built_at}` tooltip. That existing badge is the seed of the honest surface; extend the pattern rather than invent a new data source.
- **D-02:** **Do NOT add a new DB migration in this phase to introduce a content-hash column.** A migration would re-trigger the Phase-130 migration-parity gate, and that "new migration re-triggers the gate" event is **reserved for Phase 137** (migration 048, `udb_leader_targets`) as the deliberate proof the gate works. If a build-content hash is wanted for HON-01's "content hash" wording, the **research step** should determine whether the **canonical build pipeline** can emit a short hash of `unit_database.json` into a **bundled artifact / generated constant** (no schema change) — and only surface it if cheap. The acceptance bar for HON-01 is *an honest, truthful provenance/version surface*, not specifically a SHA in the DB.

### syncFreshness removal depth (HON-02)
- **D-03:** **Full removal, no shim.** Delete `src/lib/syncFreshness.ts` outright — do not leave a stubbed module behind. HON-02 explicitly forbids "unused exports," so a compatibility stub would itself be a violation.
- **D-04:** **Excise `freshness` from the warnings system**, not just the UI. `SyncFreshness` is threaded as a parameter through `computeUnitWarnings` (`WarningContext.freshness`), `computeListHealthStats(…, freshness, …)`, and the typed props of `ArmyListSummaryBar` / `GameDayReadinessPanel`. Remove the parameter and any `freshness`-keyed warning branch entirely so the type has zero remaining references. Function signatures change — that's the honest cut; update all call sites.
- **D-05:** Delete `src/features/army-lists/StaleDataBanner.tsx` (grep confirms **no importers** — `ArmyListDetailPage` already carries a `// Phase 107: StaleDataBanner removed` comment). Remove the file and any now-orphaned comment/import.

### Honest provenance surface placement (HON-01)
- **D-06:** **Drop the always-green sync "freshness" dots** (`FRESHNESS_DOT_CLASS`) from `ReadyToPlayCard`, `DataHealthSummaryCard`, and `GameDayPage` — a traffic-light dot that is permanently green is dishonest UI noise. Where data identity is genuinely useful (e.g. the Data Health summary, the points badge), present it as **plain honest text**: "Data v{version}" (optionally "· built {built_at}"), with no freshness tier and no implied staleness.
- **D-07:** **Remove the dead "stale points" / "Sync stale" branches** — e.g. `ReadyToPlayCard`'s `freshness === "stale" || freshness === "aging"` block and its "Sync stale" badge text — since `getSyncFreshness` can only ever return `"fresh"`. These are the "dead dashboard branches" named in HON-01.
- **D-08:** **Zero "sync"/"refresh data" affordances** remain after this phase: audit copy and actions across the touched surfaces (dashboard cards, Game Day, army-list summary, points badge) so no button, label, or tooltip tells the user to sync or refresh bundled data. The deliberate offline architecture is the truth the UI must reflect.

### Preserve the real backup-staleness warning (success criterion 3)
- **D-09:** `src/lib/backupFreshness.ts` and all of `getBackupFreshness` / `getBackupAgeLabel` / `hasVersionMismatch` / `BACKUP_FRESHNESS_DOT_CLASS` and the version-mismatch "(outdated)" UI in `DataHealthSummaryCard` / `BackupCard` are **explicitly preserved**. Backup staleness is a *real* condition (the user's last export genuinely ages); only the *sync/data* freshness — which can never be stale for bundled data — is removed. Do not let the de-cruft sweep delete or weaken the backup warning.

### Claude's Discretion
- Exact wording of the honest provenance label ("Data v{version}", "Bundled data · v{version}", with/without `built_at`), whether the points-badge dot is removed entirely or kept as a neutral (non-traffic-light) marker, and whether a short build-content hash is surfaced at all (per D-02's research outcome) are the planner/executor's call, provided: no UI implies staleness or a sync action, the version/identity shown is truthful, and `pnpm build` is green with zero `SyncFreshness` references remaining.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 133: Honest Data Provenance" — goal + 3 success criteria (the authoritative acceptance bar), incl. "preserve any *real* backup-staleness warning, not conflated with the fake sync staleness."
- `.planning/REQUIREMENTS.md` — HON-01, HON-02 (full requirement text); Theme B context.
- `.planning/PROJECT.md` §Themes — "B — Honesty & De-cruft" (remove fake sync/freshness UI) and the rules.db-eliminated / single-database / offline architecture this phase makes the UI honest about.
- `.planning/phases/132-update-trustworthiness/132-CONTEXT.md` — prior phase; lists this exact freshness-removal work as a Deferred Idea (Theme B, Phases 133–135). Depends-on: Theme A merged to master.

### Fake-freshness code to remove (the de-cruft target)
- `src/lib/syncFreshness.ts` — the always-`"fresh"` stub (`SyncFreshness` type, `getSyncFreshness`, `getSyncAgeLabel`, `FRESHNESS_DOT_CLASS`) to **delete** (D-03).
- `src/features/army-lists/StaleDataBanner.tsx` — dead component, **no importers**, to delete (D-05).
- `src/lib/computeUnitWarnings.ts` — `WarningContext.freshness`, `computeListHealthStats(…, freshness, …)`, and any freshness-keyed warning branch to excise (D-04).
- Consumer surfaces to clean: `src/features/dashboard/ReadyToPlayCard.tsx` (dead "Sync stale" branch — D-07), `src/features/dashboard/DataHealthSummaryCard.tsx`, `src/features/game-day/GameDayPage.tsx`, `src/features/game-day/GameDayReadinessPanel.tsx`, `src/features/army-lists/ArmyListSummaryBar.tsx`, `src/features/army-lists/ArmyListDetailPage.tsx`, `src/features/army-lists/PointsFreshnessBadge.tsx`.

### Honest provenance data source (keep / extend)
- `src/hooks/useUdbMeta.ts` — `udb_meta` single-row source of truth: `version`, `built_at`, `game_system`, `unit_count`, `faction_count` (no content-hash column today — see D-02). This is the honest provenance data.
- `src/features/army-lists/PointsFreshnessBadge.tsx` — already renders `v{version}` + `built {built_at}` tooltip; the seed pattern for the honest surface (D-01).
- `@tauri-apps/api/app` `getVersion()` — app version already shown in `DataHealthSummaryCard` / About; the app-identity half of provenance.

### Real backup-staleness — PRESERVE (do not touch)
- `src/lib/backupFreshness.ts` — `getBackupFreshness`, `getBackupAgeLabel`, `hasVersionMismatch`, `BACKUP_FRESHNESS_DOT_CLASS` — genuine staleness, keep intact (D-09).
- `src/features/data-health/BackupCard.tsx` + the backup dot/version-mismatch block in `DataHealthSummaryCard.tsx` — real warning UI to preserve.

No external ADRs/specs — requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PointsFreshnessBadge` already shows honest `v{version}` from `udb_meta` with a `built {built_at}` tooltip — the honest provenance surface can reuse/extend this rather than building a new component.
- `useUdbMeta()` (staleTime/gcTime Infinity) already provides `version` + `built_at`; `getVersion()` from `@tauri-apps/api/app` already wired in `DataHealthSummaryCard`. No new data plumbing needed for the honest text.
- `backupFreshness.ts` is a self-contained, parallel module to `syncFreshness.ts` — deleting one does not affect the other (clean separation already exists).

### Established Patterns
- `getSyncFreshness()` is a Phase-107 backward-compat stub that **always returns `"fresh"`** — so every `freshness === "stale" | "aging"` branch in the codebase is provably dead and safe to delete.
- `udb_meta` "only changes when a new `unit_database.json` is imported (app release)" — i.e. data identity == app build identity, which is exactly why a static provenance label (not a freshness tier) is the honest representation.
- `SyncFreshness` is threaded as a *typed parameter* deep into the warnings layer (not just imported for display) — removal is a signature-level refactor across ~8 files, not a UI-only edit.

### Integration Points
- Dashboard: `ReadyToPlayCard` + `DataHealthSummaryCard` (remove sync dot/branches, keep backup dot).
- Game Day: `GameDayPage` + `GameDayReadinessPanel` (drop `freshness` prop/usage).
- Army lists: `ArmyListSummaryBar` (typed `freshness` prop), `ArmyListDetailPage` (`getSyncFreshness` memo), `PointsFreshnessBadge` (honest provenance home), `computeUnitWarnings` (warnings-layer param).

</code_context>

<specifics>
## Specific Ideas

- The honest test for HON-01: open every surface that used to show a freshness dot and confirm it now either shows **truthful version text** or nothing — and that **no** label/button anywhere says "sync", "refresh data", "stale", or "out of date" about the bundled unit data.
- The trap of this phase (and why success criterion 3 calls it out): the de-cruft sweep grepping for "stale"/"freshness" can easily over-reach into `backupFreshness.ts`. Backup staleness is REAL; sync staleness is FAKE. Keep them strictly separate (D-09).
- Avoid scope-coupling a content-hash DB migration into this honesty phase — it would re-fire the parity gate prematurely. The "new migration proves the gate" moment belongs to Phase 137 (D-02).

</specifics>

<deferred>
## Deferred Ideas

- Shared Abilities tab population + dead-end "Link unit" fix — Phase 134 (HON-03/04).
- Factions → Unit Database consolidation + Data Health demotion to Settings — Phase 135 (HON-05/06/07).
- Adding a true build-content-hash column to `udb_meta` via a migration — only if a future phase genuinely needs DB-level data identity; deliberately avoided here to not pre-fire the Phase-130 parity gate (the intended new-migration test is Phase 137).

None blocking — discussion stayed within the HON-01/HON-02 boundary.

</deferred>

---

*Phase: 133-honest-data-provenance*
*Context gathered: 2026-06-17*
