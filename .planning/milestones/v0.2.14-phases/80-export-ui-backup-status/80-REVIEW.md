---
phase: 80
slug: export-ui-backup-status
review_depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/lib/backupFreshness.ts
  - src/features/data-health/BackupCard.tsx
  - src/features/dashboard/DataHealthSummaryCard.tsx
  - src-tauri/src/lib.rs
findings: 5
critical: 1
warning: 3
info: 1
status: issues_found
---

# Phase 80 -- Code Review Report

**Reviewed:** 2026-05-18T18:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 80 introduces a backup freshness utility, rewires BackupCard to use `export_backup`, adds color-coded health dots to the dashboard summary card, and removes the dead `backup_database` Rust command. The code is well-structured and follows existing project patterns (mirrors `syncFreshness.ts`). However, there is one critical issue: `backupFreshness.ts` does not guard against invalid date strings, which can produce `NaN`-based comparisons and silently misclassify freshness as "overdue." There are also several warnings around reactivity, missing error handling on the Rust `VACUUM INTO` path, and a minor inconsistency in the freshness tier documentation.

## Critical Issues

### CR-01: Invalid date strings produce NaN comparisons, silently returning "overdue"

**File:** `src/lib/backupFreshness.ts:17-21`
**Issue:** Both `getBackupFreshness` and `getBackupAgeLabel` pass the `date` string directly to `new Date(date)`. If localStorage contains a corrupted or non-ISO date string, `new Date("garbage")` returns `Invalid Date`, whose `.getTime()` is `NaN`. The subtraction `Date.now() - NaN` yields `NaN`, and `NaN <= 7` is `false`, `NaN <= 30` is `false`, so the function falls through to `return "overdue"`. Similarly, `getBackupAgeLabel` would return `"Backed up NaN days ago"` displayed in the UI.

Since backup status is read from localStorage (user-writable, corruptible), this is a realistic failure path -- not just theoretical.

**Fix:** Guard against `NaN` after parsing the date. Return `"never"` (or a new error tier) when the date is unparseable:
```ts
export function getBackupFreshness(date: string | null): BackupFreshness {
  if (!date) return "never";
  const ageMs = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ageMs)) return "never";
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "healthy";
  if (ageDays <= 30) return "recommended";
  return "overdue";
}

export function getBackupAgeLabel(date: string | null): string {
  if (!date) return "No backup";
  const ageMs = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ageMs)) return "No backup";
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays === 0) return "Backed up today";
  if (ageDays === 1) return "Backed up yesterday";
  return `Backed up ${ageDays} days ago`;
}
```

Note: The existing `syncFreshness.ts` has the same vulnerability, but that reads from a database query (less likely to be corrupted). `backupFreshness.ts` reads from localStorage, making corruption more likely.

## Warnings

### WR-01: useBackupStatus is not reactive -- BackupCard shows stale data on mount

**File:** `src/features/data-health/BackupCard.tsx:29-31`
**Issue:** `useBackupStatus()` reads localStorage synchronously on every render of the hook consumer, but `BackupCard` copies the result into `useState` on line 30-31 and then manages its own `backupStatus` state. The `initialStatus` from `useBackupStatus()` is only used as the initial value for `useState`, meaning if the component re-renders due to parent changes, `backupStatus` will remain the value from the first mount.

This is mostly fine because `handleBackup` manually updates the state on line 67-68. However, if a user navigates away from the page and back, `DataHealthSummaryCard` (which calls `useBackupStatus()` directly) and `BackupCard` could show different freshness tiers if `BackupCard` was mounted before the backup and never unmounted.

**Fix:** This is a minor reactivity gap. Consider either (a) not using `useState` and always reading from `useBackupStatus()`, updating localStorage as the single source of truth:
```ts
const backupStatus = useBackupStatus();
// In handleBackup success:
localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));
// Force re-render by using a counter state or React Query invalidation
```
Or (b) accept the current design but document that `BackupCard` manages its own state for optimistic updates.

### WR-02: Future date in localStorage shows negative "days ago" value

**File:** `src/lib/backupFreshness.ts:28-31`
**Issue:** If the stored backup date is somehow in the future (clock skew, timezone bugs), `ageDays` becomes negative. `Math.floor(-0.5)` is `-1`, so `getBackupAgeLabel` would display `"Backed up -1 days ago"`. Similarly, `getBackupFreshness` would return `"healthy"` (since `-1 <= 7`), which is technically correct but the label is wrong.

**Fix:** Clamp `ageDays` to a minimum of 0:
```ts
const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
```

### WR-03: Doc comment lists four tiers but type has four values -- "recommended" described as amber but may be confused

**File:** `src/lib/backupFreshness.ts:1-11`
**Issue:** The JSDoc comment lists four bullet points including both "recommended" (amber) and "overdue" (orange). However, amber and orange are visually very similar in most Tailwind themes (`bg-amber-500` vs `bg-orange-500`). This is a UX concern more than a bug, but the three non-never tiers map to green/amber/orange rather than the conventional green/amber/red traffic-light pattern used by `syncFreshness.ts` (green/amber/red). Users may not distinguish amber from orange, reducing the effectiveness of the health signal.

**Fix:** Consider using `bg-red-500` for `overdue` instead of `bg-orange-500` to match the traffic-light convention established by `syncFreshness.ts`:
```ts
export const BACKUP_FRESHNESS_DOT_CLASS: Record<BackupFreshness, string> = {
  healthy: "bg-green-500",
  recommended: "bg-amber-500",
  overdue: "bg-red-500",     // was bg-orange-500
  never: "bg-muted-foreground",
};
```

## Info

### IN-01: Backup section in DataHealthSummaryCard lacks loading skeleton

**File:** `src/features/dashboard/DataHealthSummaryCard.tsx:52-55`
**Issue:** The sync freshness section (line 28-35) and diagnostic flags section (line 37-50) both show `<Skeleton>` components while loading, but the backup section (line 52-55) renders immediately since `useBackupStatus()` is synchronous localStorage read. This is fine functionally, but if `useBackupStatus` is ever migrated to an async source (e.g., Tauri command), it will need a loading state added. No action needed now -- just noting the asymmetry for future awareness.

**Fix:** No change needed currently. If backup status moves to an async source, add a loading guard matching the existing pattern.

---

_Reviewed: 2026-05-18T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
