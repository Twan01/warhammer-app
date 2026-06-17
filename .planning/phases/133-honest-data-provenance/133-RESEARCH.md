# Phase 133: Honest Data Provenance - Research

**Researched:** 2026-06-17
**Domain:** React/TypeScript refactor — fake-freshness removal + honest provenance surface
**Confidence:** HIGH (all findings are codebase-verified via direct file reads; no external libraries being added)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Honest provenance surface is built from `udb_meta.version` + `udb_meta.built_at` — extend `PointsFreshnessBadge`'s existing `v{version}` / `built {built_at}` pattern.
- **D-02:** Do NOT add a DB migration in this phase. A new migration is reserved for Phase 137. Research determines whether a build-content hash is already available cheaply (see §Content Hash Finding below — it is; see `version` field format).
- **D-03:** Delete `src/lib/syncFreshness.ts` outright. No shim, no compat stub.
- **D-04:** Excise `freshness` from the warnings system entirely: `WarningContext.freshness`, `computeListHealthStats(…, freshness, …)`, typed props of `ArmyListSummaryBar` and `GameDayReadinessPanel`. All call sites updated.
- **D-05:** Delete `src/features/army-lists/StaleDataBanner.tsx` (confirmed: zero importers in main source tree).
- **D-06:** Drop always-green `FRESHNESS_DOT_CLASS` dots from `ReadyToPlayCard`, `DataHealthSummaryCard`, and `GameDayPage`/`GameDayReadinessPanel`. Where data identity is useful, show plain honest text.
- **D-07:** Remove dead "stale points" / "Sync stale" branches (`freshness === "stale" || freshness === "aging"` in `ReadyToPlayCard`).
- **D-08:** Zero "sync"/"refresh data" affordances remain after this phase.
- **D-09:** `src/lib/backupFreshness.ts` and all consumers (`BackupCard.tsx`, backup section of `DataHealthSummaryCard.tsx`) are PRESERVED. Never touched by this phase.

### Claude's Discretion

- Exact wording of the honest provenance label ("Data v{version}", "Bundled data · v{version}", with/without `built_at`).
- Whether the points-badge dot is removed entirely or kept as a neutral (non-traffic-light) marker.
- Whether the short build-content hash is surfaced at all (per D-02's research outcome — the hash is already in `udb_meta.version`; no extra work needed).

### Deferred Ideas (OUT OF SCOPE)

- Shared Abilities tab, dead-end "Link unit" fix — Phase 134.
- Factions / Data Health consolidation — Phase 135.
- Adding a true build-content-hash column to `udb_meta` via a migration — Phase 137+.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HON-01 | `StaleDataBanner` and dead "stale points" dashboard branches removed; replaced by honest data-provenance/version surface. No UI offers a "sync" or "refresh data" action. | §Call-graph audit enumerates every dead branch. §Content Hash Finding confirms `udb_meta.version` already contains the hash — no new work. |
| HON-02 | All former `syncFreshness` consumers compile cleanly: no dead branches, dangling imports, or unused exports. Real backup-staleness warning preserved. | §Complete Call-Graph lists all 8 consumer files with exact changes. §Backup Preservation Boundary explicitly delineates which code must not be touched. §Tests section lists every affected test with disposition. |
</phase_requirements>

---

## Summary

Phase 133 removes the fake sync-freshness UI that was left behind when `rules.db` was eliminated (Phase 107). The `syncFreshness.ts` module is a Phase-107 backward-compat stub that **always returns `"fresh"`** — every `freshness === "stale" | "aging"` branch in the codebase is provably dead code. Eight source files and several tests reference `SyncFreshness`, `getSyncFreshness`, `getSyncAgeLabel`, or `FRESHNESS_DOT_CLASS` from that stub module, plus the function signature of `computeListHealthStats` carries a `freshness: SyncFreshness` parameter that is threaded through `WarningContext`.

The honest provenance surface is straightforward to implement: `udb_meta.version` already encodes a build-content hash (format `1.0.0+{8-char sha256}`), and `PointsFreshnessBadge` already renders it as `v{version}` with a tooltip. No new data source is needed. No DB migration is needed. The work is pure remove-and-clean.

The backup-freshness system (`src/lib/backupFreshness.ts` + `BackupCard.tsx`) is a completely separate module with a distinct type (`BackupFreshness`), distinct constants (`BACKUP_FRESHNESS_DOT_CLASS`), and distinct consumers. A careful de-cruft grep-sweep is the only risk: the sweep must stop at `backupFreshness.ts` and never touch its consumers.

**Primary recommendation:** Execute in two-wave order — (1) delete the dead files and excise the `freshness` parameter from `computeUnitWarnings.ts` (the only pure-logic file), then (2) clean up the 7 UI consumer files and their tests, closing the build last.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fake-freshness removal | Frontend | — | `syncFreshness.ts` is a pure frontend utility; no Rust/DB involvement |
| Honest provenance display | Frontend | DB (read-only) | `udb_meta` is read via `useUdbMeta`; no schema change needed |
| Warnings-system cleanup | Frontend (pure lib) | — | `computeUnitWarnings.ts` has no React or DB imports; pure TS |
| Backup staleness (PRESERVE) | Frontend | — | `backupFreshness.ts` is a parallel pure utility, untouched |
| Test suite health | Frontend (test) | — | Vitest + jsdom; affected tests update or delete alongside source changes |

---

## Standard Stack

No external packages are added. This is a pure remove-and-refactor phase.

### Existing Tools Used

| Tool | Already In Use | Purpose in This Phase |
|------|----------------|----------------------|
| TypeScript strict (`noUnusedLocals`, `noUnusedParameters`) | Yes | Enforcement mechanism: `pnpm build` fails if any `SyncFreshness` reference is missed |
| `pnpm build` (= `tsc --noEmit` + Vite build) | Yes | The green-build gate for HON-02 |
| Vitest 4 + RTL 16 | Yes | Test suite must stay at 2749 tests green |
| `useUdbMeta()` hook | Yes | Already provides `version` + `built_at` for honest provenance |
| `@tauri-apps/api/app` `getVersion()` | Yes | Already wired in `DataHealthSummaryCard` and `AboutTab` |

### Package Legitimacy Audit

No packages are installed in this phase. Section N/A.

---

## Content Hash Finding (D-02 Resolution) [VERIFIED: codebase]

The `scripts/build-unit-db.ts` pipeline already computes a SHA-256 hash of the full dataset before writing `unit_database.json`:

```typescript
// From scripts/build-unit-db.ts (tail, verified 2026-06-17)
const { createHash } = await import("node:crypto");
const hash = createHash("sha256")
  .update(JSON.stringify({ factions, units, models, weapons, points, abilities, keywords,
                           composition, detachments, detachmentAbilities, stratagems, enhancements }))
  .digest("hex")
  .slice(0, 8);
const buildVersion = `1.0.0+${hash}`;
```

This hash is written into `unit_database.json` as the top-level `version` field (e.g., `"version": "1.0.0+a3f7bc21"`), which the Rust importer stores in `udb_meta.version`. `useUdbMeta()` returns it, and `PointsFreshnessBadge` already renders it as `v{version}`.

**Implication for D-02:** The "content hash" required by HON-01's success criterion ("based on the build's content hash") is **already present** in `udb_meta.version` — no DB migration, no build-script change, no new schema needed. The honest provenance surface only needs to drop the always-green dot and keep / improve the text display of `v{version}` + `built {built_at}`.

---

## Complete Call-Graph: SyncFreshness Consumers [VERIFIED: codebase grep]

### Files to DELETE

| File | Why Delete | Importer Count |
|------|-----------|----------------|
| `src/lib/syncFreshness.ts` | The stub itself — exports `SyncFreshness`, `getSyncFreshness`, `getSyncAgeLabel`, `FRESHNESS_DOT_CLASS` | N/A (source) |
| `src/features/army-lists/StaleDataBanner.tsx` | Zero importers in main `src/` tree (D-05). Comment in `ArmyListDetailPage` already says "Phase 107: StaleDataBanner removed". | 0 |

### Files to MODIFY — Signature-Level Changes

#### `src/lib/computeUnitWarnings.ts`
- **Remove:** `import type { SyncFreshness } from "@/lib/syncFreshness";` (line 16)
- **Remove:** `freshness: SyncFreshness;` field from `WarningContext` interface (line 40)
- **Remove:** `freshness: SyncFreshness` parameter from `computeListHealthStats` signature (line 175)
- **Remove:** `const context: WarningContext = { totalPoints, pointsLimit, freshness };` — rebuild as `{ totalPoints, pointsLimit }` with `freshness` gone
- **Note:** `computeListWarnings` already has the stale-data branch removed (it contains only a comment `// Data is bundled with the app — freshness is always "fresh". Stale warning removed.`). The `freshness` field in `WarningContext` is the only remaining use; removing it from the type and both function signatures is the complete fix.
- **Build impact:** `noUnusedParameters` will catch any missed parameter. `noUnusedLocals` will catch any dangling type import.

#### `src/features/army-lists/ArmyListSummaryBar.tsx`
- **Remove:** `import type { SyncFreshness } from "@/lib/syncFreshness";` (line 16)
- **Remove:** `freshness: SyncFreshness;` from `ArmyListSummaryBarProps` interface (line 21)
- **Remove:** `freshness` from destructuring in function signature (line 35)
- **Update:** `computeListHealthStats(units, pointsLimit, freshness, enhancementTotal)` → remove `freshness` arg (line 42)
- **Update:** `computeListWarnings({ totalPoints: stats.totalPoints, pointsLimit, freshness }, units)` → remove `freshness` from context object (line 47)
- **Note:** `PointsFreshnessBadge` is already rendered in this component — the honest provenance badge stays as-is (line 162).

#### `src/features/army-lists/ArmyListDetailPage.tsx`
- **Remove:** `import { getSyncFreshness } from "@/lib/syncFreshness";` (line 21)
- **Remove:** `const { data: udbMeta } = useUdbMeta();` is already there — but it's used for other things (faction derivation etc); check if it remains needed after removing freshness. [Verified: `useUdbMeta` is also used on line 156 for `udbMeta?.built_at` passed to `getSyncFreshness` — once that memo is gone, `udbMeta` usage must be audited. If it's only used for `freshness`, remove the whole hook call; if used elsewhere, keep the hook, just drop the `freshness` memo.]
- **Remove:** `const freshness = useMemo(() => getSyncFreshness(udbMeta?.built_at ?? null), [udbMeta?.built_at]);` (lines 179–182)
- **Update:** `<ArmyListSummaryBar units={...} pointsLimit={...} freshness={freshness} ...>` — remove the `freshness` prop
- **Update:** `<GameDayReadinessPanel ... freshness={freshness}>` — wait, `GameDayPage` passes this, not `ArmyListDetailPage`. Re-check: `ArmyListDetailPage` passes `freshness` to `ArmyListSummaryBar` only.
- **Remove:** orphaned comment `// Phase 107: StaleDataBanner removed` (line 68) — it can be dropped or left as historical context. Low-priority cleanup.

#### `src/features/game-day/GameDayPage.tsx`
- **Remove:** `import { getSyncFreshness } from "@/lib/syncFreshness";` (line 10)
- **Remove:** `const freshness = getSyncFreshness(udbMeta?.built_at ?? null);` (line 31)
- **Update:** `<GameDayReadinessPanel units={units ?? []} pointsLimit={list.points_limit} freshness={freshness} />` → remove `freshness` prop (line 108–112)
- **Audit:** `const { data: udbMeta } = useUdbMeta();` (line 9) — after removing `freshness`, is `udbMeta` used elsewhere in `GameDayPage`? [Verified by reading the file: `udbMeta` is ONLY used to compute `freshness`. Remove the hook import and call entirely.]

#### `src/features/game-day/GameDayReadinessPanel.tsx`
- **Remove:** `import type { SyncFreshness } from "@/lib/syncFreshness";` (line 34)
- **Remove:** `freshness: SyncFreshness;` from `GameDayReadinessPanelProps` interface (line 41)
- **Remove:** `freshness` from function params destructuring (line 44–48)
- **Update:** `computeListHealthStats(units, pointsLimit, freshness)` → remove `freshness` arg (line 52)
- **Note:** `PointsFreshnessBadge` is already rendered at line 129 and is NOT affected. It renders correctly without `freshness` prop.

### Files to MODIFY — Display-Only Changes

#### `src/features/army-lists/PointsFreshnessBadge.tsx`
- **Remove:** `import { getSyncFreshness, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";` (lines 15–17)
- **Remove:** `const freshness = getSyncFreshness(udbMeta?.built_at ?? null);` (line 26)
- **Remove:** the colored dot element `<span className={cn("inline-block h-2 w-2 rounded-full", FRESHNESS_DOT_CLASS[freshness])} />` — the dot is always green and provides no information
- **Keep / improve:** The text `v{version}` and the tooltip `Data version {version} (built {built_at})` — these are the honest provenance display per D-01
- **Result:** Component becomes a clean text-only badge with tooltip; the `<Tooltip>` wrapper can move to wrap the text span directly. No external imports remain.
- **Note:** This component is already mocked in `ArmyListSummaryBar.test.tsx` and `GameDayReadinessPanel.test.tsx` so the mock is stable; only the component source changes.

#### `src/features/dashboard/ReadyToPlayCard.tsx`
- **Remove:** `import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";` (line 5)
- **Remove:** `const freshness = getSyncFreshness(udbMeta?.built_at ?? null);` (line 37)
- **Remove:** `const syncLabel = getSyncAgeLabel(udbMeta?.built_at ?? null);` (line 38)
- **Remove:** The freshness dot + `Clock` row: lines 58–68 (`<span className={…FRESHNESS_DOT_CLASS[freshness]}…/>`, `<span>{syncLabel}</span>`)
- **Remove (D-07, dead branch):** `{(unpaintedCount > 0 || freshness === "stale" || freshness === "aging") && …}` — collapse to `{unpaintedCount > 0 && …}` showing only the "N unpainted" badge
- **Keep:** The `useUdbMeta()` hook call (line 35) — check if it remains needed after removing freshness. [Verified: `udbMeta` is only used for `freshness`. Remove the hook import and call too.]
- **Outcome:** Simpler component; shows "N unpainted" badge only when units are unpainted. The "Data bundled with app" text from `getSyncAgeLabel` is replaced by the `PointsFreshnessBadge` in `ArmyListSummaryBar` (not in this dashboard card, which doesn't show a badge).

#### `src/features/dashboard/DataHealthSummaryCard.tsx`
- **Remove:** `import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";` (line 8)
- **Remove:** `const freshness = getSyncFreshness(udbMeta?.built_at ?? null);` (line 21)
- **Remove:** `const syncLabel = getSyncAgeLabel(udbMeta?.built_at ?? null);` (line 22)
- **Remove:** The sync freshness dot row (lines 39–43): `<span className={…FRESHNESS_DOT_CLASS[freshness]}…/>` + `<span className="text-muted-foreground">{syncLabel}</span>`
- **Replace with:** Honest provenance text using `udb_meta.version` — e.g., `Data {udbMeta.version}` or `Data v{udbMeta.version} · built {udbMeta.built_at}` (exact wording is Claude's discretion per D-06)
- **Keep untouched (D-09):** Lines 60–69 — the backup-freshness dot (`BACKUP_FRESHNESS_DOT_CLASS[backupTier]`), backup label, and version-mismatch `(outdated)` block. These use `backupFreshness.ts` exclusively and must not be touched.
- **Keep:** `const { data: udbMeta, isLoading: syncLoading } = useUdbMeta();` — still needed for version display.

### Summary Table

| File | Change Type | Exports/Types Removed | Dead Branch Removed | Note |
|------|------------|----------------------|--------------------|----|
| `src/lib/syncFreshness.ts` | DELETE | All 4 exports | N/A | Entire module gone |
| `src/features/army-lists/StaleDataBanner.tsx` | DELETE | `StaleDataBanner` | N/A | Zero importers confirmed |
| `src/lib/computeUnitWarnings.ts` | MODIFY (signature) | `WarningContext.freshness`; `freshness` param on `computeListHealthStats` | Stale branch already gone; only signature change | Pure TS, no React |
| `src/features/army-lists/ArmyListSummaryBar.tsx` | MODIFY (signature + prop) | `freshness` prop | — | Call site of `computeListHealthStats` updated |
| `src/features/army-lists/ArmyListDetailPage.tsx` | MODIFY (memo + prop) | `freshness` memo, prop to SummaryBar | — | `getSyncFreshness` import removed |
| `src/features/army-lists/PointsFreshnessBadge.tsx` | MODIFY (display) | Dot removed; no freshness type needed | — | Text + tooltip preserved; honest provenance home |
| `src/features/game-day/GameDayPage.tsx` | MODIFY (var + prop) | `freshness` var, `useUdbMeta` hook call | — | `getSyncFreshness` import removed |
| `src/features/game-day/GameDayReadinessPanel.tsx` | MODIFY (signature) | `freshness` prop type | — | `computeListHealthStats` call updated |
| `src/features/dashboard/ReadyToPlayCard.tsx` | MODIFY (display) | Dot, `syncLabel`, freshness vars | `freshness === "stale" \| "aging"` badge branch | "Sync stale" text gone; D-07 |
| `src/features/dashboard/DataHealthSummaryCard.tsx` | MODIFY (display) | Sync dot + label row | — | Backup section untouched; D-09 |

**Files confirmed NOT to import `syncFreshness.ts` (only mention in comment):**
- `src/features/data-health/DiagnosticsCard.tsx` — comment reference only ("with a stale-sync check computed client-side from syncFreshness"), no import. Update or delete the comment.

---

## Tests: Disposition Table [VERIFIED: codebase grep]

### Tests to DELETE

| Test File | Reason |
|-----------|--------|
| `tests/army-list/StaleDataBanner.test.tsx` | Tests the deleted `StaleDataBanner` component (5 test cases, ARMY-04). Delete alongside the source file. |

### Tests to MODIFY

| Test File | What References `syncFreshness` | Required Change |
|-----------|--------------------------------|-----------------|
| `tests/army-lists/ArmyListSummaryBar.test.tsx` | `import type { SyncFreshness } from "@/lib/syncFreshness"` (line 16); `freshness: SyncFreshness` in `renderBar()` signature (line 62); `renderBar(units, 2000, "fresh")` calls pass `"fresh"` as 3rd arg throughout | Remove the `SyncFreshness` import; remove `freshness` parameter from `renderBar()`; update all `renderBar(units, limit, "fresh")` calls to `renderBar(units, limit)`. The tests themselves continue to test warning badges — no test logic changes, only the signature. |
| `tests/game-day/GameDayReadinessPanel.test.tsx` | `import type { SyncFreshness } from "@/lib/syncFreshness"` (line 55); `freshness: "fresh" as SyncFreshness` in `defaultProps` (line 59); `{ pointsLimit: 2000, freshness: "stale" }` passed to `renderPanel` (line 111) | Remove the `SyncFreshness` import; remove `freshness` from `defaultProps` and the `renderPanel()` override type; update the test at line 107–115 that passes `freshness: "stale"` — the test is checking that warnings show at all (passes `pointsLimit: 2000` and an unpainted unit with exceeded points), so rewrite to remove the `freshness` override; the warnings still appear from other conditions. |
| `tests/lib/computeUnitWarnings.test.ts` | `makeContext({ freshness: "stale" })` and similar in lines 210–226 (three tests asserting `"Stale points data"` does NOT appear); `freshness: "fresh"` in `makeContext` factory (line 49) | Remove `freshness` from `makeContext` factory and `WarningContext` type; the three "does NOT return Stale points data" tests remain valid but must drop the `freshness` override — rewrite as `makeContext()` with no freshness arg. The "does not return Stale points data" assertion is still correct (the code never returns it), just the context factory no longer has the field. |
| `tests/army-list/ArmyListDetailNotFound.test.tsx` | `vi.mock("@/lib/syncFreshness", () => ({ getSyncFreshness: () => "fresh" }))` (lines 84–86) | Remove the entire `vi.mock("@/lib/syncFreshness", …)` block. `ArmyListDetailPage` will no longer import `syncFreshness`. |
| `tests/army-list/ArmyListNotesNoOp.test.tsx` | `vi.mock("@/lib/syncFreshness", () => ({ getSyncFreshness: () => "fresh" }))` (lines 90–92) | Same: remove the mock block. |
| `tests/feedback/FBK-02-GameDayErrorState.test.tsx` | `vi.mock("@/lib/syncFreshness", () => ({ getSyncFreshness: () => null }))` (lines 37–39) | Remove the mock block. `GameDayPage` will no longer import `syncFreshness`. |

### Tests CONFIRMED SAFE (backup freshness) [VERIFIED: codebase grep]

| Test File | What It Tests | Action |
|-----------|--------------|--------|
| `tests/data-health/backupFreshness.test.ts` | `BACKUP_FRESHNESS_DOT_CLASS`, `getBackupFreshness`, `getBackupAgeLabel`, `hasVersionMismatch` | No change — `backupFreshness.ts` is preserved per D-09 |

---

## Backup Preservation Boundary (D-09) [VERIFIED: codebase]

The following constitutes the **complete** backup-freshness surface. Nothing in this list is touched by Phase 133:

**Module:** `src/lib/backupFreshness.ts`
- Exports: `BackupFreshness` type, `getBackupFreshness`, `getBackupAgeLabel`, `hasVersionMismatch`, `BACKUP_FRESHNESS_DOT_CLASS`

**Consumers (DO NOT TOUCH):**
- `src/features/data-health/BackupCard.tsx` — uses `BACKUP_FRESHNESS_DOT_CLASS` at lines 204, 221, 235
- `src/features/dashboard/DataHealthSummaryCard.tsx` — uses `getBackupFreshness`, `getBackupAgeLabel`, `hasVersionMismatch`, `BACKUP_FRESHNESS_DOT_CLASS` at lines 9, 28–30, 61–69. **Specifically:** the backup dot row (`BACKUP_FRESHNESS_DOT_CLASS[backupTier]` at line 61) and the "(outdated)" block (lines 63–68) must not be removed when cleaning the sync-dot row above it.

**Test:** `tests/data-health/backupFreshness.test.ts` — must remain green, unmodified.

**Grep guard:** When sweeping for "freshness" to delete, the pattern `backupFreshness` must be in an explicit exclude list. `BACKUP_FRESHNESS_DOT_CLASS` and `BackupFreshness` are distinct identifiers from `FRESHNESS_DOT_CLASS` and `SyncFreshness` — a careful reader will not confuse them, but the plan should call this out explicitly.

---

## Architecture Patterns

### Execution Order (Dependency-Safe Sequencing)

The signature change in `computeUnitWarnings.ts` ripples to all UI consumers. The plan must sequence changes so TypeScript does not see a broken intermediate state within the same commit/wave:

```
Wave A (pure-logic layer first):
  1. computeUnitWarnings.ts   — remove SyncFreshness import + WarningContext.freshness + computeListHealthStats freshness param
  2. ArmyListSummaryBar.tsx   — update computeListHealthStats/computeListWarnings call sites + remove prop
  3. ArmyListDetailPage.tsx   — remove memo + prop pass
  4. GameDayPage.tsx          — remove var + prop pass
  5. GameDayReadinessPanel.tsx — remove prop + update computeListHealthStats call

Wave B (display-only cleanup):
  6. PointsFreshnessBadge.tsx  — drop dot, keep text + tooltip
  7. ReadyToPlayCard.tsx       — drop dot + syncLabel + dead "Sync stale" branch
  8. DataHealthSummaryCard.tsx — drop sync dot row; add honest version text; keep backup row

Wave C (deletions):
  9. DELETE src/lib/syncFreshness.ts
  10. DELETE src/features/army-lists/StaleDataBanner.tsx

Wave D (tests):
  11. DELETE tests/army-list/StaleDataBanner.test.tsx
  12. UPDATE tests/army-lists/ArmyListSummaryBar.test.tsx
  13. UPDATE tests/game-day/GameDayReadinessPanel.test.tsx
  14. UPDATE tests/lib/computeUnitWarnings.test.ts
  15. REMOVE mock blocks from ArmyListDetailNotFound, ArmyListNotesNoOp, FBK-02 test files
```

After Wave C, `pnpm build` must pass (TS strict mode enforces HON-02). After Wave D, `pnpm test` must pass (2749 tests green, net -5 tests: 5 `StaleDataBanner` test cases deleted).

### Anti-Patterns to Avoid

- **Leaving a compat stub:** D-03 forbids it. `noUnusedLocals`/`noUnusedParameters` would also flag it.
- **Removing `BACKUP_FRESHNESS_DOT_CLASS` thinking it is `FRESHNESS_DOT_CLASS`:** Different names, different files, different semantics. The backup dot is real; the sync dot is fake.
- **Removing `useUdbMeta()` from `DataHealthSummaryCard`:** The card still needs `udbMeta` for the honest version display row. Only the `syncFreshness` calls and the `syncLabel`/freshness-dot row are removed.
- **Forgetting `DiagnosticsCard.tsx`:** It has a comment referencing `syncFreshness` but no import — no code change needed, but the plan executor should update the stale comment.

---

## Honest Provenance Surface: What Already Exists

The following surfaces already show truthful version data and require minimal change:

| Surface | Current State | Change Needed |
|---------|--------------|---------------|
| `PointsFreshnessBadge.tsx` | Shows `v{version}` text + tooltip, but also an always-green `FRESHNESS_DOT_CLASS[freshness]` dot | Drop the dot; keep/improve the text + tooltip (D-06, D-01) |
| `VersionInfoCard.tsx` (data-health) | Shows "Unit Database v{version}" in card title + "Built: {built_at}" subtext + app version, schema, unit count | Already honest — no `syncFreshness` import, no change needed |
| `AboutTab.tsx` (settings) | Shows app version + "Data date: {built_at}" + unit/faction counts | Already honest — no `syncFreshness` import, no change needed |
| `DataHealthSummaryCard.tsx` | Shows sync dot (fake) + syncLabel ("Data bundled with app") + backup dot (real) | Remove sync dot + label; replace with honest "v{version}" text using `udbMeta.version` |

**Key insight:** `VersionInfoCard` and `AboutTab` are already fully honest with zero `syncFreshness` references — no changes required in those files.

---

## Common Pitfalls

### Pitfall 1: Over-broad grep sweep deletes backup freshness
**What goes wrong:** Grep for "freshness" or "stale" in `src/` hits `backupFreshness.ts` and its consumers.
**Why it happens:** The module names are similar; "freshness" appears in both.
**How to avoid:** Limit the sync-freshness removal to the exact identifiers `SyncFreshness`, `getSyncFreshness`, `getSyncAgeLabel`, `FRESHNESS_DOT_CLASS` (all from `src/lib/syncFreshness.ts`). Never touch `BackupFreshness`, `getBackupFreshness`, `getBackupAgeLabel`, `BACKUP_FRESHNESS_DOT_CLASS`.
**Warning signs:** Any edit to `src/lib/backupFreshness.ts`, `src/features/data-health/BackupCard.tsx`, or the backup-related rows in `DataHealthSummaryCard.tsx`.

### Pitfall 2: Forgetting `useUdbMeta` hook cleanup in `GameDayPage` and `ReadyToPlayCard`
**What goes wrong:** The import and hook call for `useUdbMeta` become unused after the `freshness` variable is removed — TypeScript `noUnusedLocals` fails the build.
**Why it happens:** `udbMeta` was only used to feed `getSyncFreshness(udbMeta?.built_at ?? null)`. Once that line goes, `udbMeta` is unused.
**How to avoid:** Audit both `GameDayPage.tsx` and `ReadyToPlayCard.tsx` after removing the `freshness` variable — if no other use of `udbMeta` exists, remove the `useUdbMeta` hook call and its import too.
- `GameDayPage.tsx`: `udbMeta` confirmed used ONLY for `freshness` — remove hook call.
- `ReadyToPlayCard.tsx` (`ReadyToPlayCardInner`): `udbMeta` confirmed used ONLY for `freshness` — remove hook call.

### Pitfall 3: Passing tests that still reference `SyncFreshness` type
**What goes wrong:** Tests import `SyncFreshness` from the deleted module, which breaks `pnpm test` even after `pnpm build` passes.
**Why it happens:** TypeScript type imports in test files are not always caught by `noUnusedLocals` in the same way as production code.
**How to avoid:** Explicitly update the 6 affected test files as documented in the Tests table above. Run `pnpm test` as the final gate.

### Pitfall 4: `computeUnitWarnings.test.ts` — `makeContext` factory hardcodes `freshness: "fresh"`
**What goes wrong:** After removing `freshness` from `WarningContext`, the factory function `makeContext({ freshness: "fresh" })` fails to compile.
**How to avoid:** Remove `freshness` from the `makeContext` factory's defaults and from all individual `makeContext({ freshness: … })` calls. The test assertions about "does NOT return Stale points data" remain valid but drop the `freshness: "stale"` override — just call `makeContext()` with no freshness key.

### Pitfall 5: `ArmyListDetailPage.tsx` still imports `useUdbMeta` for other reasons
**What goes wrong:** Incorrectly removing the `useUdbMeta` import from `ArmyListDetailPage` would break faction-related logic that also uses `udbMeta`.
**How to avoid:** Check that `udbMeta` is used only for `freshness` in this file. [Verified: `ArmyListDetailPage` uses `useUdbMeta()` at line 156, but `udbMeta` is only consumed at line 180 (`getSyncFreshness(udbMeta?.built_at ?? null)`). The faction logic uses `wahapediaFactionId` from `faction?.wahapedia_faction_id` — it does NOT use `udbMeta`. Therefore `useUdbMeta` can be removed from `ArmyListDetailPage` after the freshness memo is gone.]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Honest version display | New component or new data source | Extend `PointsFreshnessBadge` + `udb_meta.version` already in DB | Data and display pattern already exist |
| Content hash for provenance | New build step, new DB column | `udb_meta.version` already IS a content hash (`1.0.0+{sha256[:8]}`) | Already computed and stored; zero new work |
| Compile enforcement of HON-02 | Manual audit | `pnpm build` with `noUnusedLocals`/`noUnusedParameters` | TypeScript strict mode is the automated enforcer |

---

## Environment Availability

Step 2.6: SKIPPED — this phase is pure source code / test changes. No external tools, services, or CLIs are added or invoked beyond the existing `pnpm build` and `pnpm test` commands.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `pnpm test -- tests/lib/computeUnitWarnings.test.ts tests/army-lists/ArmyListSummaryBar.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HON-01 | `StaleDataBanner` gone, no "sync"/"stale" UI text remains | Delete test | N/A (test deleted) | Delete `tests/army-list/StaleDataBanner.test.tsx` |
| HON-01 | Honest `v{version}` shown in `PointsFreshnessBadge` | Component test (existing mock) | `pnpm test -- tests/army-lists/ArmyListSummaryBar.test.tsx` | Existing (update) |
| HON-01 | No dead "Sync stale" branch in `ReadyToPlayCard` | Build (dead code is TS error) | `pnpm build` | — |
| HON-02 | `pnpm build` green, zero `SyncFreshness` refs | Build gate | `pnpm build` | — |
| HON-02 | `computeListHealthStats` compiles without `freshness` param | Unit test | `pnpm test -- tests/lib/computeUnitWarnings.test.ts` | Existing (update) |
| HON-02 | `GameDayReadinessPanel` prop-type clean | Component test | `pnpm test -- tests/game-day/GameDayReadinessPanel.test.tsx` | Existing (update) |
| HON-02 | Backup staleness still works (D-09) | Unit test | `pnpm test -- tests/data-health/backupFreshness.test.ts` | Existing (unchanged) |

### Sampling Rate
- **Per task commit:** `pnpm build` (catches dangling TS imports immediately via strict mode)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The phase reduces test count by 5 (StaleDataBanner suite deleted).

---

## Security Domain

No security-sensitive surfaces are modified. This phase removes display-only UI dead code and updates pure-function signatures. ASVS categories V2–V6 are not applicable. `security_enforcement` context: no explicit `false` in config, but all changes are cosmetic/structural — no authentication, session, input validation, cryptography, or access control surfaces are touched.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ArmyListDetailPage.tsx` uses `useUdbMeta` only for the `freshness` memo (no other use of `udbMeta`) | Call-graph / Pitfall 5 | If wrong: removing `useUdbMeta` would break a feature; mitigate by checking all `udbMeta?.` references in the file before removing | [VERIFIED: confirmed only used for getSyncFreshness at line 180] |
| A2 | `GameDayPage.tsx` uses `useUdbMeta` only for `freshness` | Pitfall 2 | If wrong: same as A1 | [VERIFIED: confirmed only used for getSyncFreshness at line 31] |
| A3 | `ReadyToPlayCard.tsx` uses `useUdbMeta` only for `freshness` | Pitfall 2 | If wrong: same as A1 | [VERIFIED: confirmed only used for getSyncFreshness at line 37] |

All three assumptions are marked VERIFIED — the files were read directly during research. The assumptions log is retained for executor reference.

**If this table is empty-risk:** All claims were codebase-verified. No external package, API, or community pattern claims are made.

---

## Open Questions

1. **`DiagnosticsCard.tsx` comment**
   - What we know: Contains the comment "with a stale-sync check computed client-side from syncFreshness" but no import.
   - What's unclear: Whether to update the comment text or leave it as historical documentation.
   - Recommendation: Update the comment to remove the outdated reference (e.g., replace with "data version is sourced from udb_meta"). Low priority — can be done in same commit as `DataHealthSummaryCard` cleanup.

2. **`ReadyToPlayCard` — clock icon after removing sync row**
   - What we know: The `Clock` icon is imported from Lucide React and used only in the sync-freshness row being deleted.
   - What's unclear: After removing the sync row, `Clock` becomes unused — TypeScript will flag it.
   - Recommendation: Remove `Clock` from the Lucide import in `ReadyToPlayCard.tsx` alongside the sync row.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase reads — all files listed in the Call-Graph section were read in full during this research session.
- `scripts/build-unit-db.ts` — verified content hash computation and `version` field format.
- `src-tauri/migrations/038_udb_schema.sql` — verified `udb_meta` schema (no `content_hash` column exists).

### Metadata

**Confidence breakdown:**
- Call-graph completeness: HIGH — grep across all `src/**/*.{ts,tsx}` confirmed all consumers
- Test disposition: HIGH — all 6 affected test files read and analyzed
- Content hash finding: HIGH — build script read directly, mechanism verified end-to-end
- Backup boundary: HIGH — `backupFreshness.ts` and its consumers read directly

**Research date:** 2026-06-17
**Valid until:** Stable — no external dependencies; valid until codebase changes
