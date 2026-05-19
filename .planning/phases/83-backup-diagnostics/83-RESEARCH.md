# Phase 83: Backup Diagnostics - Research

**Researched:** 2026-05-19
**Domain:** Frontend UI -- React components, localStorage state, progressive disclosure
**Confidence:** HIGH

## Summary

Phase 83 is a frontend-only enhancement to the existing BackupCard component on the Data Health page. It adds four diagnostic capabilities: "never backed up" flagging, staleness threshold detection, version mismatch detection (comparing stored backup app_version against current app version), and progressive disclosure via a collapsible detail section. No new routes, pages, database changes, or Rust code are required.

All infrastructure already exists. The `BackupStatus` interface in `useDiagnostics.ts` needs one new optional field (`app_version`), the `handleBackup` function in BackupCard needs to store it, and the BackupCard JSX needs a `Collapsible` wrapper for diagnostic detail rows. The shadcn/ui `Collapsible` component is already installed and available. The `getVersion()` API from `@tauri-apps/api/app` is already used in `VersionInfoCard.tsx` and provides the pattern to follow.

**Primary recommendation:** Extend BackupStatus with `app_version`, add version storage to handleBackup, wrap diagnostic details in shadcn Collapsible, and add a version mismatch indicator to DataHealthSummaryCard.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Expand existing BackupCard with collapsible diagnostic detail section -- no new component
- **D-02:** Extend BackupStatus interface with `app_version: string` in localStorage
- **D-03:** Compare stored `app_version` against current `getVersion()` on load -- no Rust code needed
- **D-04:** Version mismatch is informational, not blocking
- **D-05:** Use shadcn/ui Collapsible primitive for expandable diagnostic details
- **D-06:** Collapsible trigger is a small chevron or "Details" link, subtle when healthy
- **D-07:** Collapsed shows tier dot + age label (current behavior); expanded shows diagnostic rows
- **D-08:** Thresholds are code constants in backupFreshness.ts, not user-configurable
- **D-09:** DataHealthSummaryCard gets version mismatch indicator (small warning icon or "(outdated)" text)

### Claude's Discretion
- Exact layout of diagnostic detail rows within collapsible section
- Whether to use Collapsible directly or wrap in a helper
- CSS styling for detail rows (follow existing card patterns)
- Chevron icon vs text "Details" link
- Whether to store schema_version in BackupStatus localStorage (nice-to-have)
- Loading state handling while getVersion() resolves
- Error message wording for version mismatch diagnostic text

### Deferred Ideas (OUT OF SCOPE)
- User-configurable staleness thresholds (settings UI)
- Backup scheduling / auto-backup reminders
- Schema migration compatibility check at diagnostic level
- Safety backup age diagnostics
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DGN-01 | Data Health flags "never backed up" state | BackupCard already shows "Never -- No backup yet" for `tier === "never"`; diagnostic expansion adds prominent call-to-action in expanded detail |
| DGN-02 | Data Health flags backup older than configurable threshold | `getBackupFreshness()` returns "overdue" for >30 days; diagnostic detail shows exact age in days via `getBackupAgeLabel()` |
| DGN-03 | Data Health flags backup version mismatch | New `app_version` field on BackupStatus compared against `getVersion()` from `@tauri-apps/api/app` |
| DGN-04 | Diagnostic details available without overwhelming normal users | Collapsible section: collapsed shows tier dot + label; expanded shows detail rows |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Backup freshness computation | Browser / Client | -- | Pure function in `backupFreshness.ts`, no backend needed |
| Version mismatch detection | Browser / Client | -- | Compares localStorage value against `getVersion()` (Tauri JS API) |
| Progressive disclosure UI | Browser / Client | -- | React component with shadcn Collapsible |
| Dashboard mismatch indicator | Browser / Client | -- | DataHealthSummaryCard reads same localStorage + getVersion() |
| App version retrieval | Browser / Client | Tauri Backend | `getVersion()` calls Tauri IPC but is a standard JS API |

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| radix-ui (Collapsible) | installed | Progressive disclosure primitive | Already in shadcn/ui component library at `src/components/ui/collapsible.tsx` [VERIFIED: codebase] |
| @tauri-apps/api/app | installed | `getVersion()` for app version | Already used in VersionInfoCard.tsx [VERIFIED: codebase] |
| lucide-react | installed | ChevronDown icon for collapsible trigger | Already used throughout app [VERIFIED: codebase] |

**Installation:** None required -- all dependencies are already present.

## Architecture Patterns

### System Architecture Diagram

```
localStorage (BACKUP_STORAGE_KEY)
  |
  v
useBackupStatus() ------> BackupStatus { date, path, success, app_version }
  |                                          |
  v                                          v
getBackupFreshness(date)              getVersion() [async, Tauri IPC]
  |                                          |
  v                                          v
tier: healthy|recommended|overdue|never   currentVersion: string
  |                                          |
  +------------------------------------------+
  |
  v
BackupCard.tsx
  +-- Collapsed: tier dot + age label (existing)
  +-- CollapsibleTrigger: chevron/details link
  +-- CollapsibleContent: diagnostic detail rows
       +-- Exact backup age (days)
       +-- Version: backup vs current (match/mismatch)
       +-- Tier explanation text

DataHealthSummaryCard.tsx
  +-- Existing backup row
  +-- Conditional version mismatch indicator
```

### Recommended Changes (no new files, extend existing)

```
src/
  hooks/useDiagnostics.ts         # Add app_version to BackupStatus interface
  features/data-health/
    BackupCard.tsx                 # Add Collapsible diagnostic section + version write
  features/dashboard/
    DataHealthSummaryCard.tsx      # Add version mismatch indicator
  lib/backupFreshness.ts          # No changes needed (thresholds already correct)
tests/
  data-health/
    backupCard.test.tsx            # Extend with diagnostic display tests
    backupStatus.test.ts           # Extend with app_version field tests
    backupDiagnostics.test.ts      # NEW: version mismatch logic tests
```

### Pattern 1: Async Version Fetch (established pattern)
**What:** Fetch app version via `getVersion()` in useEffect, store in state
**When to use:** Anywhere current app version is needed in a component
**Example:**
```typescript
// Source: src/features/data-health/VersionInfoCard.tsx (line 48-49)
const [appVersion, setAppVersion] = useState<string | null>(null);
useEffect(() => {
  getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
}, []);
```

### Pattern 2: BackupStatus localStorage Read/Write (established pattern)
**What:** Read/write BackupStatus JSON to localStorage via BACKUP_STORAGE_KEY
**When to use:** Storing/retrieving backup metadata
**Example:**
```typescript
// Source: src/features/data-health/BackupCard.tsx (line 65-70)
const status: BackupStatus = {
  date: new Date().toISOString(),
  path: destination,
  success: true,
  // Phase 83 addition:
  app_version: currentAppVersion,
};
localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));
```

### Pattern 3: Collapsible Component Usage
**What:** shadcn/ui Collapsible wraps a trigger and content for progressive disclosure
**When to use:** Showing/hiding detail sections
**Example:**
```typescript
// Source: src/components/ui/collapsible.tsx (radix-ui based)
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

<Collapsible>
  <CollapsibleTrigger>
    <ChevronDown className="h-4 w-4" />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* detail rows */}
  </CollapsibleContent>
</Collapsible>
```

### Anti-Patterns to Avoid
- **Fetching app version on every render:** Use useEffect with empty deps array -- getVersion() is async IPC, cache the result in useState
- **Making app_version required on BackupStatus:** Must be optional (`app_version?: string`) for backward compatibility with existing localStorage entries that lack it
- **Using red for version mismatch:** Decision D-04 says it is informational -- use amber/warning tone, not destructive red

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible disclosure | Custom show/hide state | shadcn/ui `Collapsible` (radix-ui) | Handles accessibility (aria-expanded), animation, keyboard |
| App version retrieval | Reading package.json or config | `getVersion()` from `@tauri-apps/api/app` | Official Tauri API, already used in VersionInfoCard |
| Freshness tiers | New computation logic | Existing `getBackupFreshness()` + `getBackupAgeLabel()` | Already tested and working in Phase 80 |

## Common Pitfalls

### Pitfall 1: Backward Compatibility with Existing localStorage
**What goes wrong:** Adding `app_version` as a required field breaks parsing of existing localStorage entries that lack it
**Why it happens:** Users who created backups before Phase 83 have `BackupStatus` without `app_version`
**How to avoid:** Make `app_version` optional (`app_version?: string`). When missing, treat as "unknown" version -- show "Version info unavailable" in diagnostics rather than a mismatch warning
**Warning signs:** Tests fail when useBackupStatus returns entries without app_version

### Pitfall 2: Async getVersion() During Render
**What goes wrong:** Calling getVersion() directly in render causes re-render loops or stale comparisons
**Why it happens:** getVersion() returns a Promise (Tauri IPC call)
**How to avoid:** Follow VersionInfoCard pattern: useEffect + useState. Show skeleton/loading while version resolves. Only compare once both stored and current versions are available
**Warning signs:** Component flickers between "loading" and "mismatch" states

### Pitfall 3: Version Comparison Semantics
**What goes wrong:** String comparison of versions like "0.2.13" vs "0.2.6" gives wrong results
**Why it happens:** String comparison is lexicographic, not semantic
**How to avoid:** For this phase, simple string inequality is sufficient (D-04: "different version" not "newer/older"). The diagnostic just says "backup was made with vX, current is vY". No need for semver comparison
**Warning signs:** Overcomplicating with semver parsing when a simple `!==` suffices

### Pitfall 4: Collapsible Default State
**What goes wrong:** Collapsible starts open, defeating the "progressive disclosure" purpose
**Why it happens:** Forgetting to set `defaultOpen={false}` or `open={false}` on the Collapsible
**How to avoid:** Always default to closed. The collapsed state IS the primary interface per D-07
**Warning signs:** Diagnostic details visible on page load

## Code Examples

### Extended BackupStatus Interface
```typescript
// Source: derived from src/hooks/useDiagnostics.ts (line 55-59)
export interface BackupStatus {
  date: string;
  path: string;
  success: boolean;
  app_version?: string;  // Phase 83: optional for backward compat
}
```

### Version Mismatch Detection Logic
```typescript
// Pure function, testable without Tauri
export function hasVersionMismatch(
  backupVersion: string | undefined,
  currentVersion: string | null,
): boolean {
  if (!backupVersion || !currentVersion) return false;
  return backupVersion !== currentVersion;
}
```

### Diagnostic Detail Row Pattern
```typescript
// Follow existing card patterns: label left, value right
function DiagnosticRow({ label, value, status }: {
  label: string;
  value: string;
  status: "ok" | "warn" | "error";
}) {
  const dotClass = status === "ok" ? "bg-green-500"
    : status === "warn" ? "bg-amber-500"
    : "bg-orange-500";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {value}
      </span>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No backup diagnostics | Tier dot + age label (Phase 80) | Phase 80 | Users see freshness but no details |
| BackupStatus without version | BackupStatus + app_version (Phase 83) | This phase | Enables version mismatch detection |

**Deprecated/outdated:** None -- all existing infrastructure is current and stable.

## Assumptions Log

> All claims verified against codebase. No external packages needed, no assumed claims.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| -- | -- | -- | -- |

**All claims in this research were verified via codebase inspection -- no user confirmation needed.**

## Open Questions

1. **Schema version in diagnostic details**
   - What we know: `useSchemaVersions()` hook exists and returns current hobbyforge + rules schema versions. BackupManifest includes `schema_version`.
   - What's unclear: Whether to also store schema_version in localStorage BackupStatus (CONTEXT.md lists this as Claude's discretion, nice-to-have)
   - Recommendation: Skip for now. The version mismatch (app_version) is the required diagnostic. Schema version is already visible in VersionInfoCard. Adding it to BackupStatus localStorage is additive and can be done later without breaking changes.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 (jsdom) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/data-health` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DGN-01 | "Never backed up" flag visible in diagnostic details | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | Extend existing |
| DGN-02 | Overdue backup shows age in diagnostic details | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | Extend existing |
| DGN-03 | Version mismatch detected and displayed | unit | `pnpm test -- tests/data-health/backupDiagnostics.test.ts` | Wave 0 |
| DGN-04 | Details hidden by default, visible on expand | unit | `pnpm test -- tests/data-health/backupCard.test.tsx` | Extend existing |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-health`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/data-health/backupDiagnostics.test.ts` -- covers DGN-03 version mismatch logic (pure function tests)
- [ ] Extend `tests/data-health/backupCard.test.tsx` -- covers DGN-01, DGN-02, DGN-04 collapsible behavior
- [ ] Extend `tests/data-health/backupStatus.test.ts` -- covers app_version field on BackupStatus

## Security Domain

This phase is frontend-only with no authentication, no user input beyond clicking buttons, no network calls, and no database writes. Security surface is minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | no | localStorage read uses try/catch with JSON.parse (existing pattern) |
| V6 Cryptography | no | -- |

### Known Threat Patterns

None applicable. This phase reads from localStorage (already written by the app itself) and calls `getVersion()` (Tauri built-in). No user-supplied input is processed.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/hooks/useDiagnostics.ts` -- BackupStatus interface, useBackupStatus hook
- Codebase inspection: `src/features/data-health/BackupCard.tsx` -- current BackupCard layout, handleBackup function
- Codebase inspection: `src/lib/backupFreshness.ts` -- tier computation, dot classes
- Codebase inspection: `src/components/ui/collapsible.tsx` -- shadcn Collapsible (radix-ui based)
- Codebase inspection: `src/features/data-health/VersionInfoCard.tsx` -- getVersion() usage pattern
- Codebase inspection: `src/features/dashboard/DataHealthSummaryCard.tsx` -- backup status row
- Codebase inspection: `src/types/backup.ts` -- BackupManifest with app_version field

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, no new packages
- Architecture: HIGH -- extending existing components with well-established patterns
- Pitfalls: HIGH -- backward compatibility and async patterns are well-understood in this codebase

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (stable -- no external dependencies or fast-moving APIs)
