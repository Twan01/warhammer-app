# Phase 80: Export UI + Backup Status — Research

**Researched:** 2026-05-18
**Domain:** React/TypeScript UI wiring — Tauri command migration, freshness utility, status display
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Four-tier health system: Healthy (≤7 days, green), Recommended (8–30 days, yellow), Overdue (>30 days, orange/red), Never (no backup recorded, red). Thresholds live in a shared utility so both BackupCard and DataHealthSummaryCard use identical logic.
- **D-02:** Health tier calculation is a pure function `getBackupFreshness(date: string | null)` returning a tier enum — mirrors the existing `getSyncFreshness` pattern in `src/lib/syncFreshness.ts`.
- **D-03:** Keep the existing Card layout structure (icon + text left, action button right). Add a color-coded dot badge inline with the age text, matching the dot pattern from DataHealthSummaryCard's sync freshness display.
- **D-04:** Update the default filename to `hobbyforge-backup-YYYY-MM-DD-HHMM.zip` and the save dialog filter to `HobbyForge Backup (*.zip)`.
- **D-05:** Replace `invoke("backup_database", { destination })` with `invoke("export_backup", { destination })`. The BackupStatus localStorage shape (`{ date, path, success }`) stays the same — only the file extension changes.
- **D-06:** Replace the plain text backup label in DataHealthSummaryCard with a color-coded dot + text, using the same `FRESHNESS_DOT_CLASS` CSS class map pattern. Create a parallel `BACKUP_FRESHNESS_DOT_CLASS` map or reuse the existing one if the tier names align.
- **D-07:** The backup status text remains: "Backed up today", "Backed up yesterday", "Backed up N days ago", "No backup" — but now preceded by the health dot.
- **D-08:** Remove the `backup_database` command from `src-tauri/src/lib.rs` and its entry in the `invoke_handler` macro.

### Claude's Discretion

- Whether to create a new `backupFreshness.ts` utility or extend the existing `syncFreshness.ts` (prefer separate file for clarity)
- Exact CSS color classes for each backup tier (follow the sync freshness pattern)
- Whether the health dot goes before or after the text in BackupCard
- Any minor layout tweaks needed for visual consistency

### Deferred Ideas (OUT OF SCOPE)

- Restore UI and restore action on BackupCard — Phase 81 (RST-03)
- Schema compatibility validation during restore — Phase 81 (RST-04, RST-05)
- Safety backup before rules sync — Phase 82 (SAF-02)
- Backup history list (multiple past backups) — Future enhancement
- Auto-backup scheduling — Future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STS-01 | Data Health shows last backup date and age (e.g., "2 days ago") | `getBackupAgeLabel()` in new backupFreshness.ts; existing `formatRelativeDate` inline helper in BackupCard upgraded |
| STS-02 | Backup health indicator (healthy / recommended / overdue / never backed up) | `getBackupFreshness()` + `BACKUP_FRESHNESS_DOT_CLASS` in new backupFreshness.ts; color-dot `<span>` already used in DataHealthSummaryCard |
| STS-03 | BackupCard links to export and restore actions | Export action: rewire invoke to `export_backup`; save dialog filter/filename updated. Restore action is Phase 81 (deferred) |
| STS-04 | Dashboard DataHealthSummaryCard reflects backup status | Swap HardDrive icon + plain text for color-dot + age label using `BACKUP_FRESHNESS_DOT_CLASS` |
</phase_requirements>

---

## Summary

Phase 80 is a focused UI wiring phase with no new routes, no new database tables, and no new Tauri commands — Phase 79 already shipped all three Rust commands (`export_backup`, `validate_backup`, `create_safety_backup`). The work is:

1. Create `src/lib/backupFreshness.ts` — a pure utility mirroring `syncFreshness.ts` exactly, with four tiers (healthy/recommended/overdue/never) and matching dot-class map.
2. Update `BackupCard.tsx` — swap `backup_database` → `export_backup`, update save dialog to `.zip`, add color-coded dot + tier label beside the age text.
3. Update `DataHealthSummaryCard.tsx` — replace the `HardDrive` icon + plain backup text with a color-coded dot + age label using the new utility.
4. Remove `backup_database` from `lib.rs` invoke_handler.

All existing patterns are verified in the codebase. The plan can be written with HIGH confidence from reading the source files alone — no ecosystem research required.

**Primary recommendation:** Mirror `syncFreshness.ts` precisely for `backupFreshness.ts`, then do surgical edits to BackupCard and DataHealthSummaryCard as documented by the UI-SPEC. The test suite needs updates to match the new Tauri command name and new UI states.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Backup freshness tier calculation | Frontend utility (`src/lib/`) | — | Pure function; no backend needed — only the date stored in localStorage |
| Age label formatting | Frontend utility (`src/lib/`) | — | Pure string formatting; same pattern as syncFreshness |
| Export invocation + save dialog | Frontend component (BackupCard) | Rust backend (`export_backup`) | UI drives the flow; Rust executes the file operation |
| BackupStatus persistence | localStorage (Frontend) | — | Established pattern from Phase 77; no DB table |
| Color dot display | Frontend component | — | Pure rendering; both BackupCard and DataHealthSummaryCard consume the same utility |
| Old command removal | Rust backend (lib.rs) | — | Dead code removal; command no longer referenced by frontend |

---

## Standard Stack

### Core (all pre-existing in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/api/core` | project version | `invoke()` — call Rust commands | Project standard for all Tauri command calls |
| `@tauri-apps/plugin-dialog` | project version | `save()` — native OS save dialog | Used in existing BackupCard; no alternative |
| `sonner` | project version | `toast.success` / `toast.error` | Project-wide toast pattern |
| `lucide-react` | project version | Icons (Download, Loader2) | Project icon library per CLAUDE.md |
| `react` | 19 | useState for local backup state | Standard; BackupCard uses local state not React Query |

No new packages required. This phase installs nothing.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tailwindcss` | 4 | `bg-green-500`, `bg-amber-500`, `bg-orange-500`, `bg-muted-foreground` | Dot color classes per UI-SPEC |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `backupFreshness.ts` | Extend `syncFreshness.ts` | Separate file keeps sync and backup concerns decoupled; locked by D-02 and CONTEXT.md specifics |
| `bg-red-500` for Overdue | `bg-orange-500` | Orange = urgency without alarm; UI-SPEC locked this to orange |
| `bg-red-500` for Never | `bg-muted-foreground` | Grey = "not started yet" not "error"; mirrors sync never tier |

---

## Package Legitimacy Audit

No packages are installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Create Backup"
        ↓
BackupCard.handleBackup()
        ↓
save() [Tauri plugin-dialog]  ←─── OS native save dialog
        ↓ destination path
invoke("export_backup", { destination })  ←─── Rust: VACUUM INTO + zip
        ↓ Result<String, String>
localStorage.setItem(BACKUP_STORAGE_KEY, { date, path, success })
        ↓
setBackupStatus(status)  ←─── local React state update
        ↓
Re-render BackupCard with new tier dot + label
        ↓
toast.success / toast.error
```

```
DataHealthSummaryCard (read-only display)
        ↓
useBackupStatus()  ←─── reads localStorage synchronously
        ↓
getBackupFreshness(backup?.date ?? null)  ←─── pure tier calculation
        ↓
BACKUP_FRESHNESS_DOT_CLASS[tier]  ←─── Tailwind class lookup
        ↓
<span dot /> + age label text
```

### Recommended Project Structure

No new directories. New file:

```
src/
  lib/
    syncFreshness.ts      (existing — untouched)
    backupFreshness.ts    (NEW — mirror of syncFreshness.ts)
  features/
    data-health/
      BackupCard.tsx      (modify)
    dashboard/
      DataHealthSummaryCard.tsx  (modify)
src-tauri/
  src/
    lib.rs               (remove backup_database command + handler entry)
```

### Pattern 1: Freshness Utility (exact mirror of syncFreshness.ts)

**What:** Pure functions + const map. No side effects, no imports beyond TypeScript.
**When to use:** Any component that needs backup tier or age label.

```typescript
// Source: src/lib/syncFreshness.ts (verified — exact pattern to replicate)

export type BackupFreshness = "healthy" | "recommended" | "overdue" | "never";

export function getBackupFreshness(date: string | null): BackupFreshness {
  if (!date) return "never";
  const ageMs = Date.now() - new Date(date).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "healthy";
  if (ageDays <= 30) return "recommended";
  return "overdue";
}

export function getBackupAgeLabel(date: string | null): string {
  if (!date) return "No backup";
  const ageMs = Date.now() - new Date(date).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return "Backed up today";
  if (ageDays === 1) return "Backed up yesterday";
  return `Backed up ${ageDays} days ago`;
}

export const BACKUP_FRESHNESS_DOT_CLASS: Record<BackupFreshness, string> = {
  healthy: "bg-green-500",
  recommended: "bg-amber-500",
  overdue: "bg-orange-500",
  never: "bg-muted-foreground",
};
```

[VERIFIED: src/lib/syncFreshness.ts — verified pattern, tier names from UI-SPEC]

### Pattern 2: Color Dot Inline Element

**What:** Inline `<span>` with Tailwind background + rounded-full for status dot.
**When to use:** Anywhere a tier needs visual color coding.

```tsx
// Source: DataHealthSummaryCard.tsx line 37 (verified in codebase)
<span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
```

BackupCard uses `mr-1.5` between dot and label text (UI-SPEC layout contract). DataHealthSummaryCard wraps dot + label in `flex items-center gap-1.5`.

### Pattern 3: BackupCard Subtitle Structure (post-migration)

**What:** Replace current plain subtitle with flex row: dot + combined tier+age label.

```tsx
// Current (to replace):
<span className="text-sm text-muted-foreground">
  {backupStatus
    ? `Last backup: ${formatRelativeDate(backupStatus.date)} -- ${extractFilename(backupStatus.path)}`
    : "No backups yet"}
</span>

// New pattern (from UI-SPEC):
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
  <span className="text-sm text-muted-foreground">
    {tierLabel} — {ageLabel}
  </span>
</div>
```

Tier label = `tier` with first letter uppercased (e.g., "Healthy", "Recommended", "Overdue", "Never"). Age label from `getBackupAgeLabel()`. Combined: `"Healthy — Backed up 2 days ago"`, `"Never — No backup yet"`.

[VERIFIED: BackupCard.tsx and UI-SPEC read in this session]

### Pattern 4: Invoke Migration (D-05)

**What:** Swap command name; return type changes from `void` to `string` (the destination path).

```typescript
// Before (Phase 77):
await invoke("backup_database", { destination });

// After (Phase 80):
const resultPath = await invoke<string>("export_backup", { destination });
```

`export_backup` returns `Result<String, String>` in Rust — on success it returns the destination string. The frontend already has `destination` in scope so the return value can be ignored or used for confirmation.

[VERIFIED: src-tauri/src/lib.rs lines 733-762 read in this session]

### Pattern 5: lib.rs Command Removal

**What:** Two surgical edits — delete the `backup_database` function body and remove its name from the `invoke_handler![]` macro.

```rust
// invoke_handler (lib.rs ~line 864) — current state:
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    backup_database,   // ← remove this line
    export_backup,
    validate_backup,
    create_safety_backup,
])
```

`backup_database` function spans lines 578–616 (verified). Deleting the function + removing its handler entry is the complete change.

[VERIFIED: lib.rs read in this session]

### Anti-Patterns to Avoid

- **Reusing `FRESHNESS_DOT_CLASS` from syncFreshness.ts:** Tier names differ (`fresh/aging/stale/never` vs `healthy/recommended/overdue/never`). Using the sync map with backup tiers would cause a TypeScript type error.
- **Keeping `formatRelativeDate` inline in BackupCard:** The new `getBackupAgeLabel()` in `backupFreshness.ts` replaces it. Keeping both would be duplication and would diverge.
- **Keeping `extractFilename` display in subtitle:** The new subtitle format (tier — age) drops the filename display. The filename is already captured in `backupStatus.path` if needed in the future.
- **localStorage shape change:** D-05 explicitly keeps `{ date, path, success }` unchanged. The `path` will now end in `.zip` instead of `.db` but the shape is the same. Do not add a new field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier calculation | Custom if/else in component | `getBackupFreshness()` pure utility | Both BackupCard and DataHealthSummaryCard must produce identical results — centralizing prevents drift |
| Age label formatting | Inline string formatting in each component | `getBackupAgeLabel()` utility | Same reason — DRY, testable in isolation |
| Color class lookup | Switch statement in JSX | `BACKUP_FRESHNESS_DOT_CLASS` record | Record lookup is the established codebase pattern from `FRESHNESS_DOT_CLASS` |
| Native file dialog | Custom HTML input | `save()` from `@tauri-apps/plugin-dialog` | Already used in BackupCard; provides native OS dialog with filter/default path support |

**Key insight:** The freshness utility is the most important piece to get right because it is shared. If it lives inline in each component, a future threshold change requires two edits — and the test coverage splits.

---

## Common Pitfalls

### Pitfall 1: Threshold Off-By-One (≤7 vs <7)

**What goes wrong:** Using `ageDays < 7` (from the sync freshness pattern) instead of `ageDays <= 7` for the healthy tier boundary.
**Why it happens:** `syncFreshness.ts` uses `< 7` (exclusive). The CONTEXT.md D-01 says "≤7 days" (inclusive).
**How to avoid:** Use `ageDays <= 7` for healthy, `ageDays <= 30` for recommended. The boundary day (day 7, day 30) should be in the healthier tier.
**Warning signs:** Day-7 backup shows as "Recommended" instead of "Healthy" in a unit test.

### Pitfall 2: Test Suite References `backup_database`

**What goes wrong:** `tests/data-health/backupCard.test.tsx` asserts `invoke("backup_database", ...)` — this test will fail after the migration to `export_backup`.
**Why it happens:** The test was written in Phase 77 for the old command. It's a faithful test of what existed then.
**How to avoid:** Update `backupCard.test.tsx` to assert `invoke("export_backup", { destination })` and update dialog assertions to `.zip` extension.
**Warning signs:** `pnpm test` reports `backupCard.test.tsx` failures referencing `backup_database`.

### Pitfall 3: `BackupStatus` Local State Loses Tier on Re-mount

**What goes wrong:** `BackupCard` uses local `useState<BackupStatus | null>` seeded from `useBackupStatus()` — this means the tier recalculates correctly on mount but not if the backup date is 7 days old and crosses the tier boundary while the app stays open.
**Why it happens:** Tier is calculated at render time from the stored date, so it won't drift within a normal session. This is acceptable for the current phase.
**How to avoid:** Acceptable as-is (per CONTEXT.md — no real-time refresh). Note in comments that tier is render-time only.
**Warning signs:** N/A for normal usage — only matters for multi-day sessions.

### Pitfall 4: `DataHealthSummaryCard` Imports Both Freshness Utilities

**What goes wrong:** Accidentally importing `getSyncFreshness` from `syncFreshness.ts` for the backup calculation, or mixing the wrong tier type (`SyncFreshness` where `BackupFreshness` is expected).
**Why it happens:** Similar function names + similar files. TypeScript will catch type mismatches if both maps are imported — `FRESHNESS_DOT_CLASS` expects `SyncFreshness`, `BACKUP_FRESHNESS_DOT_CLASS` expects `BackupFreshness`.
**How to avoid:** `DataHealthSummaryCard` imports both: `{getSyncFreshness, FRESHNESS_DOT_CLASS}` from `syncFreshness.ts` AND `{getBackupFreshness, BACKUP_FRESHNESS_DOT_CLASS, getBackupAgeLabel}` from `backupFreshness.ts`. Keep imports explicit and distinct.
**Warning signs:** TypeScript error: `Argument of type '"healthy"' is not assignable to parameter of type 'SyncFreshness'`.

### Pitfall 5: Rust Compiler Error After `backup_database` Removal

**What goes wrong:** Removing the function from `invoke_handler![]` but not the function definition (or vice versa) causes a Rust compile error.
**Why it happens:** Two separate edits required: delete the function body AND remove the identifier from the macro. Missing one causes either "unused function" warning (acceptable) or "unresolved identifier" error (blocks build).
**How to avoid:** Do both edits atomically in the same task. `pnpm tauri dev` compile output will confirm.
**Warning signs:** `error[E0425]: cannot find function 'backup_database' in this scope` in Rust build output.

---

## Code Examples

### Complete `backupFreshness.ts`

```typescript
// src/lib/backupFreshness.ts
// Source: mirrors src/lib/syncFreshness.ts pattern exactly

/**
 * Phase 80 — Backup freshness tier computation (STS-02).
 *
 * Four tiers based on age since last backup:
 * - healthy: ≤7 days (green)
 * - recommended: 8–30 days (amber) — backup suggested
 * - overdue: >30 days (orange) — backup strongly recommended
 * - never: no backup recorded
 *
 * Pure function — no side effects, no backend dependency.
 */

export type BackupFreshness = "healthy" | "recommended" | "overdue" | "never";

export function getBackupFreshness(date: string | null): BackupFreshness {
  if (!date) return "never";
  const ageMs = Date.now() - new Date(date).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "healthy";
  if (ageDays <= 30) return "recommended";
  return "overdue";
}

/** Returns human-readable age string for display. */
export function getBackupAgeLabel(date: string | null): string {
  if (!date) return "No backup";
  const ageMs = Date.now() - new Date(date).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return "Backed up today";
  if (ageDays === 1) return "Backed up yesterday";
  return `Backed up ${ageDays} days ago`;
}

/** CSS class for the backup freshness dot color. */
export const BACKUP_FRESHNESS_DOT_CLASS: Record<BackupFreshness, string> = {
  healthy: "bg-green-500",
  recommended: "bg-amber-500",
  overdue: "bg-orange-500",
  never: "bg-muted-foreground",
};
```

[VERIFIED: mirrors syncFreshness.ts verified in this session; thresholds from CONTEXT.md D-01; dot classes from UI-SPEC]

### BackupCard — Key Changes (not a full file rewrite)

```tsx
// 1. New imports to add:
import {
  getBackupFreshness,
  getBackupAgeLabel,
  BACKUP_FRESHNESS_DOT_CLASS,
  type BackupFreshness,
} from "@/lib/backupFreshness";

// 2. In handleBackup() — filename (line 42 area):
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const timestamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const defaultFilename = `hobbyforge-backup-${timestamp}.zip`;

// 3. In save() call — updated filters:
const destination = await save({
  title: "Save Backup",
  defaultPath: defaultFilename,
  filters: [{ name: "HobbyForge Backup", extensions: ["zip"] }],
});

// 4. Invoke change (line 54):
await invoke("export_backup", { destination });

// 5. Render — replace subtitle span with dot+label:
const tier = getBackupFreshness(backupStatus?.date ?? null);
const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
const ageLabel = backupStatus ? getBackupAgeLabel(backupStatus.date) : "No backup yet";

// In JSX (replaces current subtitle span):
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
  <span className="text-sm text-muted-foreground">
    {tierLabel} — {ageLabel}
  </span>
</div>
```

[VERIFIED: BackupCard.tsx read in this session; UI-SPEC layout contract confirmed]

### DataHealthSummaryCard — Backup Row Change

```tsx
// Add imports:
import {
  getBackupFreshness,
  getBackupAgeLabel,
  BACKUP_FRESHNESS_DOT_CLASS,
} from "@/lib/backupFreshness";

// In component body — replace existing backupLabel inline calc:
const backupTier = getBackupFreshness(backup?.date ?? null);
const backupLabel = getBackupAgeLabel(backup?.date ?? null);

// In JSX — replace current HardDrive + plain text row (lines 57-60):
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[backupTier]}`} />
  <span className="text-muted-foreground">{backupLabel}</span>
</div>
```

Remove: `import { Database, HardDrive } from "lucide-react"` — `HardDrive` is no longer used. `Database` remains (still used for the warnings row).

[VERIFIED: DataHealthSummaryCard.tsx read in this session; UI-SPEC backup row layout confirmed]

### lib.rs — `backup_database` Removal

Two edits:

1. Delete the entire `backup_database` function (lines 575–616, including doc comment).
2. Remove `backup_database,` from the `invoke_handler![]` macro (line ~866).

No other references to `backup_database` exist in the codebase after BackupCard is migrated.

[VERIFIED: lib.rs invoke_handler read in this session; BackupCard.tsx confirmed as the only caller]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `invoke("backup_database")` → raw .db file copy | `invoke("export_backup")` → .zip with metadata.json | Phase 79 (Rust) / Phase 80 (UI) | User gets a structured archive; restore flow becomes possible in Phase 81 |
| Plain "No backups yet" / "Last backup: X days ago — filename.db" text | Color-coded dot + tier name + age label | Phase 80 (this phase) | At-a-glance health status without reading numbers |
| HardDrive icon in dashboard backup row | Color dot (no icon) | Phase 80 | Consistent dot pattern with sync freshness row above it |

**Deprecated/outdated:**
- `backup_database` Rust command: removed in this phase — superseded by `export_backup`
- `formatRelativeDate()` inline in BackupCard: replaced by `getBackupAgeLabel()` from shared utility
- `extractFilename()` display in subtitle: removed — subtitle now shows tier+age, not filename

---

## Assumptions Log

No assumptions. All claims in this research are verified from source files read in this session or from locked decisions in CONTEXT.md.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims were verified against codebase files read in this session or locked decisions in CONTEXT.md. No assumed claims.**

---

## Open Questions

None. The phase scope is fully defined by CONTEXT.md and the UI-SPEC. All integration points are verified in the codebase.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely TypeScript/Rust source edits with no new external tools, services, or CLI utilities required beyond what the project already uses (`pnpm`, Tauri, Rust toolchain).

---

## Validation Architecture

`nyquist_validation` is enabled (per `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/data-health/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STS-01 | BackupCard shows "Backed up today/yesterday/N days ago" | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ (needs update) |
| STS-01 | `getBackupAgeLabel()` returns correct strings | unit | `pnpm test -- tests/data-health/backupFreshness.test.ts` | ❌ Wave 0 |
| STS-02 | `getBackupFreshness()` returns correct tier for each age range | unit | `pnpm test -- tests/data-health/backupFreshness.test.ts` | ❌ Wave 0 |
| STS-02 | BackupCard renders correct dot color class for each tier | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ (needs update) |
| STS-03 | Export invokes `export_backup` (not `backup_database`) | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ (needs update) |
| STS-03 | Save dialog uses `.zip` extension and correct title/filter | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | ✅ (needs update) |
| STS-04 | DataHealthSummaryCard shows dot + backup age label | unit | `pnpm test -- tests/dashboard/DataHealthSummaryCard.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/data-health/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/data-health/backupFreshness.test.ts` — covers STS-01 (`getBackupAgeLabel`) and STS-02 (`getBackupFreshness`) with all tier boundary cases
- [ ] `tests/dashboard/DataHealthSummaryCard.test.tsx` — covers STS-04 dot rendering and backup label

**Existing tests that need updates (not gaps — files exist):**
- `tests/data-health/backupCard.test.tsx` — update `invoke("backup_database")` → `invoke("export_backup")`, update dialog filter from `["db"]` to `["zip"]`, update title from `"Save Database Backup"` to `"Save Backup"`, add tier dot rendering assertions, update "No backups yet" text to "Never — No backup yet"
- `tests/data-health/backupStatus.test.ts` — no changes needed (tests `useBackupStatus` which is unchanged)

---

## Security Domain

`security_enforcement` is not explicitly set to `false` in config. Checking applicable ASVS categories:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No | All inputs are UI state + localStorage reads; no user-supplied data reaches the DB in this phase |
| V6 Cryptography | No | — |

**No security-relevant surface area in this phase.** The only "external" data is:
- `localStorage.getItem("lastBackup")` — already guarded by try/catch in `useBackupStatus()` (malformed JSON returns null, tested in `backupStatus.test.ts`)
- The destination path from the OS save dialog — passed directly to Rust; the Rust command already handles this safely (no SQL injection surface; path is used for `std::fs::File::create`)

---

## Sources

### Primary (HIGH confidence — verified in this session)

- `src/lib/syncFreshness.ts` — Pattern reference for backupFreshness.ts (read in this session)
- `src/features/data-health/BackupCard.tsx` — Current component state; line-by-line change points identified (read in this session)
- `src/features/dashboard/DataHealthSummaryCard.tsx` — Current component state; backup row location confirmed (read in this session)
- `src/hooks/useDiagnostics.ts` — `useBackupStatus()`, `BackupStatus` interface, `BACKUP_STORAGE_KEY` (read in this session)
- `src-tauri/src/lib.rs` lines 575–616, 733–762, 864–870 — `backup_database`, `export_backup`, and invoke_handler (read in this session)
- `.planning/phases/80-export-ui-backup-status/80-CONTEXT.md` — All locked decisions (read in this session)
- `.planning/phases/80-export-ui-backup-status/80-UI-SPEC.md` — Color map, layout contract, copywriting contract (read in this session)
- `tests/data-health/backupCard.test.tsx` — Existing test coverage and what needs updating (read in this session)
- `tests/data-health/backupStatus.test.ts` — Existing test coverage (read in this session)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries pre-existing and verified in codebase
- Architecture: HIGH — all integration points verified line-by-line in source files
- Pitfalls: HIGH — identified from direct code reading (test assertions, function signatures)
- Test gaps: HIGH — confirmed by glob search of test directory

**Research date:** 2026-05-18
**Valid until:** Until Phase 80 implementation begins (stable codebase — no risk of drift)
