# Phase 80: Export UI + Backup Status - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/backupFreshness.ts` | utility | transform | `src/lib/syncFreshness.ts` | exact |
| `src/features/data-health/BackupCard.tsx` | component | request-response | `src/features/data-health/BackupCard.tsx` (self — surgical edit) | exact |
| `src/features/dashboard/DataHealthSummaryCard.tsx` | component | request-response | `src/features/dashboard/DataHealthSummaryCard.tsx` (self — surgical edit) | exact |
| `src-tauri/src/lib.rs` | config | — | self — remove dead command + handler entry | exact |
| `tests/data-health/backupFreshness.test.ts` | test | transform | `tests/datasheet/syncFreshness.test.ts` | exact |
| `tests/data-health/backupCard.test.tsx` | test | request-response | `tests/data-health/backupCard.test.tsx` (self — update existing) | exact |

---

## Pattern Assignments

### `src/lib/backupFreshness.ts` (utility, transform) — NEW FILE

**Analog:** `src/lib/syncFreshness.ts`

**Complete file pattern** (lines 1–41 of analog):
```typescript
/**
 * Phase 45 — Freshness tier computation (META-05).
 *
 * Three tiers based on age since last sync:
 * ...
 *
 * Pure function — no side effects, no backend dependency.
 */

export type SyncFreshness = "fresh" | "aging" | "stale" | "never";

export function getSyncFreshness(lastSyncAt: string | null): SyncFreshness {
  if (!lastSyncAt) return "never";
  const ageMs = Date.now() - new Date(lastSyncAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return "fresh";
  if (ageDays < 14) return "aging";
  return "stale";
}

/** Returns human-readable age string for tooltip. */
export function getSyncAgeLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Never synced";
  const ageMs = Date.now() - new Date(lastSyncAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return "Synced today";
  if (ageDays === 1) return "Synced yesterday";
  return `Synced ${ageDays} days ago`;
}

/** CSS class for the freshness dot color. */
export const FRESHNESS_DOT_CLASS: Record<SyncFreshness, string> = {
  fresh: "bg-green-500",
  aging: "bg-amber-500",
  stale: "bg-red-500",
  never: "bg-muted-foreground",
};
```

**Adaptation rules for backupFreshness.ts:**
- Replace type name `SyncFreshness` → `BackupFreshness`
- Replace tier names `"fresh" | "aging" | "stale"` → `"healthy" | "recommended" | "overdue"`
- Replace thresholds: `< 7` → `<= 7`, `< 14` → `<= 30` (CRITICAL: use inclusive `<=`, not `<`)
- Replace const name `FRESHNESS_DOT_CLASS` → `BACKUP_FRESHNESS_DOT_CLASS`
- Replace dot colors: `stale: "bg-red-500"` → `overdue: "bg-orange-500"` (orange, not red)
- Replace function names `getSyncFreshness` → `getBackupFreshness`, `getSyncAgeLabel` → `getBackupAgeLabel`
- Replace label strings: "Never synced" → "No backup", "Synced today" → "Backed up today", etc.
- Update JSDoc tiers and thresholds in the header comment

**Final shape to produce:**
```typescript
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

---

### `src/features/data-health/BackupCard.tsx` (component, request-response) — MODIFY

**Analog:** `src/features/data-health/BackupCard.tsx` (self — surgical edits)

**Imports pattern** (lines 1–19 of current file):
```typescript
import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useBackupStatus,
  BACKUP_STORAGE_KEY,
  type BackupStatus,
} from "@/hooks/useDiagnostics";
```

**Add these imports** (after existing imports):
```typescript
import {
  getBackupFreshness,
  getBackupAgeLabel,
  BACKUP_FRESHNESS_DOT_CLASS,
  type BackupFreshness,
} from "@/lib/backupFreshness";
```

**Filename + save dialog pattern** (lines 42–48 of current file — replace entirely):
```typescript
// BEFORE (line 42):
const defaultFilename = `hobbyforge-backup-${new Date().toISOString().slice(0, 10)}.db`;

const destination = await save({
  title: "Save Database Backup",
  defaultPath: defaultFilename,
  filters: [{ name: "SQLite Database", extensions: ["db"] }],
});

// AFTER:
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const timestamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const defaultFilename = `hobbyforge-backup-${timestamp}.zip`;

const destination = await save({
  title: "Save Backup",
  defaultPath: defaultFilename,
  filters: [{ name: "HobbyForge Backup", extensions: ["zip"] }],
});
```

**Invoke change** (line 54 of current file):
```typescript
// BEFORE:
await invoke("backup_database", { destination });

// AFTER:
await invoke("export_backup", { destination });
```

**Core render pattern** (lines 72–98 of current file — subtitle section only):
```typescript
// Color dot pattern (from DataHealthSummaryCard.tsx lines 36–38):
<span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />

// Tier + age derivation (add before return statement):
const tier = getBackupFreshness(backupStatus?.date ?? null);
const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
const ageLabel = getBackupAgeLabel(backupStatus?.date ?? null);

// Replace subtitle span (lines 77–81):
// BEFORE:
<span className="text-sm text-muted-foreground">
  {backupStatus
    ? `Last backup: ${formatRelativeDate(backupStatus.date)} -- ${extractFilename(backupStatus.path)}`
    : "No backups yet"}
</span>

// AFTER:
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[tier]}`} />
  <span className="text-sm text-muted-foreground">
    {tierLabel} — {ageLabel}
  </span>
</div>
```

**Dead code to remove** (lines 21–32 of current file):
```typescript
// Remove these two inline helpers — replaced by backupFreshness.ts utilities:
function formatRelativeDate(isoDate: string): string { ... }
function extractFilename(path: string): string { ... }
```

**Error handling pattern** (lines 63–68 of current file — keep unchanged):
```typescript
} catch (error) {
  toast.error(
    `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  setIsBackingUp(false);
}
```

---

### `src/features/dashboard/DataHealthSummaryCard.tsx` (component, request-response) — MODIFY

**Analog:** `src/features/dashboard/DataHealthSummaryCard.tsx` (self — surgical edits)

**Current imports pattern** (lines 1–6):
```typescript
import { Database, HardDrive } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useDiagnosticFlags, useBackupStatus } from "@/hooks/useDiagnostics";
import { getSyncFreshness, getSyncAgeLabel, FRESHNESS_DOT_CLASS } from "@/lib/syncFreshness";
```

**Import changes:**
```typescript
// Change line 1: remove HardDrive (no longer used), keep Database
import { Database } from "lucide-react";

// Add after line 6:
import {
  getBackupFreshness,
  getBackupAgeLabel,
  BACKUP_FRESHNESS_DOT_CLASS,
} from "@/lib/backupFreshness";
```

**Existing sync freshness dot pattern to copy for backup** (lines 36–39):
```tsx
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${FRESHNESS_DOT_CLASS[freshness]}`} />
  <span className="text-muted-foreground">{syncLabel}</span>
</div>
```

**Backup label derivation replacement** (lines 20–27 — replace inline IIFE):
```typescript
// BEFORE (inline IIFE):
const backupLabel = (() => {
  if (!backup) return "No backup";
  const ageMs = Date.now() - new Date(backup.date).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return "Backed up today";
  if (ageDays === 1) return "Backed up yesterday";
  return `Backed up ${ageDays} days ago`;
})();

// AFTER (use shared utility):
const backupTier = getBackupFreshness(backup?.date ?? null);
const backupLabel = getBackupAgeLabel(backup?.date ?? null);
```

**Backup row JSX replacement** (lines 57–60):
```tsx
// BEFORE:
<div className="flex items-center gap-1.5">
  <HardDrive size={12} />
  <span className="text-muted-foreground">{backupLabel}</span>
</div>

// AFTER (copy dot pattern from lines 36–39):
<div className="flex items-center gap-1.5">
  <span className={`inline-block h-2 w-2 rounded-full ${BACKUP_FRESHNESS_DOT_CLASS[backupTier]}`} />
  <span className="text-muted-foreground">{backupLabel}</span>
</div>
```

---

### `src-tauri/src/lib.rs` (config) — MODIFY (dead code removal)

**Analog:** self — two surgical edits

**Function to delete entirely** (lines 575–616):
```rust
/// Create a consistent backup of hobbyforge.db using VACUUM INTO.
/// Uses a direct sqlx connection (same pattern as bulk_sync_rules) so the
/// backup is an atomic, consistent snapshot even if the app is running.
#[tauri::command]
async fn backup_database(
    app: tauri::AppHandle,
    destination: String,
) -> Result<(), String> {
    // ... entire function body (lines 579–616) ...
}
```

**invoke_handler entry to remove** (line 866):
```rust
// BEFORE (lines 864–870):
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    backup_database,   // ← remove this line
    export_backup,
    validate_backup,
    create_safety_backup,
])

// AFTER:
.invoke_handler(tauri::generate_handler![
    bulk_sync_rules,
    export_backup,
    validate_backup,
    create_safety_backup,
])
```

**Critical:** Both edits must be done together. Missing one causes a Rust compile error (`error[E0425]: cannot find function 'backup_database' in this scope`).

---

### `tests/data-health/backupFreshness.test.ts` (test, transform) — NEW FILE

**Analog:** `tests/datasheet/syncFreshness.test.ts`

**Full test structure pattern** (lines 1–79 of analog):
```typescript
/**
 * Phase 45 — syncFreshness utility tests (META-05).
 *
 * Uses vi.useFakeTimers() + vi.setSystemTime() for deterministic date testing.
 * All dates relative to a fixed "now" of 2026-05-08T12:00:00.000Z.
 */
import { vi, describe, it, expect, afterEach } from "vitest";
import { getSyncFreshness, getSyncAgeLabel } from "@/lib/syncFreshness";

const NOW = new Date("2026-05-08T12:00:00.000Z");

function daysAgo(days: number): string {
  const d = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getSyncFreshness", () => {
  it("returns 'never' when lastSyncAt is null", () => {
    expect(getSyncFreshness(null)).toBe("never");
  });

  it("returns 'fresh' when synced 2 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getSyncFreshness(daysAgo(2))).toBe("fresh");
  });
  // ... boundary cases for each tier ...
});
```

**Adaptation rules for backupFreshness.test.ts:**
- Import `getBackupFreshness, getBackupAgeLabel` from `@/lib/backupFreshness`
- Replace tier names in assertions: `"fresh"` → `"healthy"`, `"aging"` → `"recommended"`, `"stale"` → `"overdue"`
- Update boundary test cases to match inclusive thresholds (day 7 = "healthy", day 8 = "recommended", day 30 = "recommended", day 31 = "overdue")
- Replace age label strings: "Never synced" → "No backup", "Synced today" → "Backed up today", etc.
- Add test ID prefix `STS-01` / `STS-02` in descriptions per project convention

---

### `tests/data-health/backupCard.test.tsx` (test, request-response) — MODIFY EXISTING

**Analog:** `tests/data-health/backupCard.test.tsx` (self — update existing assertions)

**Mock setup pattern to keep** (lines 13–44):
```typescript
const mockSave = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/hooks/useDiagnostics", () => ({
  useBackupStatus: () => null,
  BACKUP_STORAGE_KEY: "lastBackup",
}));
```

**Specific assertions that need updating:**

Test "calls save dialog when button is clicked" (lines 65–72):
```typescript
// BEFORE:
expect(mockSave).toHaveBeenCalledWith(
  expect.objectContaining({
    title: "Save Database Backup",
    filters: expect.arrayContaining([
      expect.objectContaining({ extensions: ["db"] }),
    ]),
  })
);

// AFTER:
expect(mockSave).toHaveBeenCalledWith(
  expect.objectContaining({
    title: "Save Backup",
    filters: expect.arrayContaining([
      expect.objectContaining({ extensions: ["zip"] }),
    ]),
  })
);
```

Test "invokes backup_database when dialog returns a path" (lines 84–95):
```typescript
// BEFORE:
expect(mockInvoke).toHaveBeenCalledWith("backup_database", {
  destination: "C:\\backups\\test.db",
});

// AFTER:
expect(mockInvoke).toHaveBeenCalledWith("export_backup", {
  destination: "C:\\backups\\test.zip",
});
```

Test "shows 'No backups yet'" (line 53):
```typescript
// BEFORE:
expect(screen.getByText("No backups yet")).toBeInTheDocument();

// AFTER (new subtitle format is dot + "Never — No backup"):
expect(screen.getByText(/Never — No backup/)).toBeInTheDocument();
```

**New assertions to add** (dot color rendering per STS-02):
```typescript
it("STS-02: renders green dot when backup is recent (≤7 days)", async () => {
  // Override useBackupStatus mock to return a recent date
  // Assert presence of element with bg-green-500 class
});

it("STS-02: renders muted dot when no backup exists", () => {
  render(<BackupCard />);
  const dot = document.querySelector(".bg-muted-foreground");
  expect(dot).toBeInTheDocument();
});
```

---

## Shared Patterns

### Color Dot Inline Element
**Source:** `src/features/dashboard/DataHealthSummaryCard.tsx` lines 36–38
**Apply to:** BackupCard.tsx subtitle, DataHealthSummaryCard.tsx backup row
```tsx
<span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS_MAP[tier]}`} />
```
Wrapper: `<div className="flex items-center gap-1.5">` — keeps dot and label aligned.

### localStorage Backup Status Read
**Source:** `src/hooks/useDiagnostics.ts` lines 65–73
**Apply to:** BackupCard.tsx (already uses it), DataHealthSummaryCard.tsx (already uses it)
```typescript
export function useBackupStatus(): BackupStatus | null {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackupStatus;
  } catch {
    return null;
  }
}
```
BackupStatus shape: `{ date: string; path: string; success: boolean }` — do NOT add fields.

### Tauri Invoke + Toast Error Handling
**Source:** `src/features/data-health/BackupCard.tsx` lines 52–69
**Apply to:** BackupCard.tsx handleBackup (keep pattern, only change command name)
```typescript
setIsBackingUp(true);
try {
  await invoke("export_backup", { destination });
  // ... persist to localStorage + setState ...
  toast.success("Backup created successfully");
} catch (error) {
  toast.error(
    `Backup failed: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  setIsBackingUp(false);
}
```

### Fake Timers Test Pattern
**Source:** `tests/datasheet/syncFreshness.test.ts` lines 7–19
**Apply to:** `tests/data-health/backupFreshness.test.ts`
```typescript
import { vi, describe, it, expect, afterEach } from "vitest";
const NOW = new Date("2026-05-18T12:00:00.000Z");
function daysAgo(days: number): string {
  const d = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}
afterEach(() => { vi.useRealTimers(); });
// In each test: vi.useFakeTimers(); vi.setSystemTime(NOW);
```

---

## No Analog Found

All files have close analogs. No entries.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/features/data-health/`, `src/features/dashboard/`, `src-tauri/src/`, `tests/datasheet/`, `tests/data-health/`
**Files scanned:** 7 source files read directly
**Pattern extraction date:** 2026-05-18

**Critical pitfalls captured:**
1. Threshold boundary: use `<= 7` and `<= 30` (inclusive), NOT `< 7` like syncFreshness.ts
2. Tier name mismatch: `FRESHNESS_DOT_CLASS` uses `SyncFreshness` keys — cannot be reused for `BackupFreshness`
3. lib.rs: delete BOTH the function body (lines 575–616) AND the handler entry (line 866) atomically
4. Test: update `"backup_database"` → `"export_backup"`, `["db"]` → `["zip"]`, title string, and "No backups yet" text
```
