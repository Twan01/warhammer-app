# Phase 121: Settings Foundation - Research

**Researched:** 2026-06-10
**Domain:** SQLite key-value settings table + React Query hook layer + shadcn Tabs page shell
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Flat key-value table: `app_settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`. All values stored as TEXT; type coercion happens in TypeScript hook layer.
- **D-02:** Migration file: `044_app_settings.sql` (next in sequence after 043). Table creation only — no seed data. Sensible defaults live in the hook layer.
- **D-03:** Generic hook pair: `useAppSettings()` returns all settings as a typed map, `useUpdateSetting()` is a mutation accepting `{key: string, value: string}`. Query key: `["app-settings"]`.
- **D-04:** Individual phases may add typed convenience wrappers — but that is Phase 122+ scope. Phase 121 only delivers the generic layer.
- **D-05:** React Query integration follows existing patterns: `staleTime` 5min, cache invalidation on mutation via `queryClient.invalidateQueries({ queryKey: APP_SETTINGS_KEY })`.
- **D-06:** Exactly 3 tabs: **Preferences** / **Data** / **About**. Tab content in Phase 121 is placeholder text. Default active tab: Preferences.
- **D-07:** Use shadcn `Tabs` component (already at `src/components/ui/tabs.tsx`). Default active tab: Preferences.
- **D-08:** Settings page replaces current placeholder at `src/app/settings/page.tsx`. Route already wired at `/settings`.
- **D-09:** New file `src/db/queries/appSettings.ts` with: `getAppSettings()`, `getAppSetting(key)`, `upsertAppSetting(key, value)`. Uses `INSERT OR REPLACE` for upsert.
- **D-10:** Hook file: `src/hooks/useAppSettings.ts` following established `ENTITY_KEY` + `useEntity` + mutation pattern.

### Claude's Discretion

- File organization and component structure within the settings feature module
- Whether to use a Sheet or inline form elements for individual settings (future phases decide per-control)
- Error handling approach for malformed settings values

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INF-01 | `app_settings` table (migration) with key-value storage for all settings | Migration 044 pattern verified against lib.rs registration; `CREATE TABLE IF NOT EXISTS` + `INSERT OR REPLACE` upsert pattern |
| INF-02 | Settings query/hook layer (`useAppSettings`, `useUpdateSetting`) with React Query integration | useFactions.ts + factions.ts query module patterns fully verified in codebase |
| INF-03 | Settings page with 3-tab layout (Preferences / Data / About) using shadcn Tabs | tabs.tsx component verified present; UI-SPEC approved with full layout contract |
</phase_requirements>

---

## Summary

Phase 121 is a pure infrastructure phase: one new SQLite migration, one query module, one React Query hook file, and a replacement settings page. All four components follow patterns already established in the codebase — the research found no novel technical territory. Every pattern needed has a verified reference implementation.

The migration is straightforward: `CREATE TABLE IF NOT EXISTS app_settings` at version 44, registered in `lib.rs` `get_migrations()`. The query module follows `src/db/queries/factions.ts` exactly — `getDb()` singleton, `$1/$2` parameterized syntax, `INSERT OR REPLACE` for upsert (no custom conflict handling needed). The hook follows `src/hooks/useFactions.ts` exactly — `ENTITY_KEY` constant, `useQuery`, `useMutation` with `onSuccess` invalidation. The settings page replaces the `PlaceholderPage` stub at `src/app/settings/page.tsx` using the `Tabs` component from `src/components/ui/tabs.tsx`, which is already installed.

The UI-SPEC (121-UI-SPEC.md) is approved and fully prescriptive: `p-6 space-y-6` layout, `text-xl font-semibold` h1, shadcn Tabs with `defaultValue="preferences"`, placeholder copy per tab, and `<Skeleton>` loading state while `useAppSettings` resolves.

**Primary recommendation:** Implement in four sequential tasks — migration file + lib.rs registration, query module, hook file, settings page — each with a matching test file following established codebase patterns.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Settings persistence | Database / Storage | — | SQLite `app_settings` table; all reads/writes go through `hobbyforge.db` |
| Settings read/write API | API / Backend (query module) | — | `src/db/queries/appSettings.ts` is the sole DB caller per architecture rules |
| Settings cache + reactivity | Frontend (React Query) | — | `useAppSettings` / `useUpdateSetting` hook owns invalidation and stale logic |
| Settings UI shell | Frontend (React component) | — | `SettingsPage` renders tabs; reads from hook, no direct DB access |
| Type coercion | Frontend (hook layer) | — | TEXT → number/boolean/JSON coercion lives in `useAppSettings.ts`, not in SQL |

---

## Standard Stack

No new external packages are introduced in this phase. All libraries are already installed and in use across the codebase. [VERIFIED: codebase inspection]

### Core (already installed)

| Library | Version in use | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| `@tauri-apps/plugin-sql` | Existing | SQLite DB access | Tauri 2 official plugin — sole DB layer per architecture |
| `@tanstack/react-query` | Existing | Server state caching + mutations | Already manages all DB-backed state |
| `radix-ui` (via tabs.tsx) | Existing | Accessible tab primitives | Used by shadcn/ui new-york preset |

### No Packages to Install

This phase requires zero new `npm install` commands. All dependencies are present.

---

## Package Legitimacy Audit

No new packages are installed in this phase. Audit section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
SettingsPage (src/app/settings/page.tsx)
      |
      | calls
      v
useAppSettings / useUpdateSetting  (src/hooks/useAppSettings.ts)
      |                   |
      | queryFn           | mutationFn
      v                   v
getAppSettings()     upsertAppSetting(key, value)
      \                   /
       \                 /
        src/db/queries/appSettings.ts
                |
                | getDb()
                v
        DB singleton (src/db/client.ts)
                |
                v
        hobbyforge.db → app_settings table
```

Data flow for a read:
1. `SettingsPage` mounts → `useAppSettings()` fires
2. React Query checks cache (`["app-settings"]`) — cache miss on first load
3. `getAppSettings()` selects all rows from `app_settings`, returns `Record<string, string>`
4. Hook returns typed map; page renders tab content (or Skeleton while pending)

Data flow for a write (future phases):
1. Consumer calls `useUpdateSetting().mutate({ key, value })`
2. `upsertAppSetting(key, value)` executes `INSERT OR REPLACE` on `app_settings`
3. `onSuccess` calls `queryClient.invalidateQueries({ queryKey: APP_SETTINGS_KEY })`
4. React Query refetches; UI reflects new value

### Recommended Project Structure

```
src/
  db/
    queries/
      appSettings.ts       ← new: getAppSettings, getAppSetting, upsertAppSetting
  hooks/
    useAppSettings.ts      ← new: APP_SETTINGS_KEY, useAppSettings, useUpdateSetting
  app/
    settings/
      page.tsx             ← replace PlaceholderPage with real SettingsPage
src-tauri/
  migrations/
    044_app_settings.sql   ← new: CREATE TABLE IF NOT EXISTS app_settings
  src/
    lib.rs                 ← add version 44 Migration entry
tests/
  settings/
    migration044.test.ts   ← migration file content + lib.rs registration
    useAppSettings.test.ts ← APP_SETTINGS_KEY constant + invalidation contract
```

No separate `src/features/settings/` module is needed for Phase 121 — the page is a shell with no feature-specific schema, form, or filter store. If Phase 122+ grows complex, a `src/features/settings/` folder can be introduced then.

### Pattern 1: Key-Value Query Module (appSettings.ts)

**What:** Three functions mirroring the factions.ts style — one select-all, one select-by-key, one upsert.
**When to use:** Every settings read/write goes through these functions.

```typescript
// Source: mirrors src/db/queries/factions.ts pattern [VERIFIED: codebase]
import { getDb } from "@/db/client";

export type AppSettingsMap = Record<string, string>;

export async function getAppSettings(): Promise<AppSettingsMap> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM app_settings"
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function upsertAppSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, datetime('now'))`,
    [key, value]
  );
}
```

### Pattern 2: React Query Hook (useAppSettings.ts)

**What:** Hook pair following the ENTITY_KEY + useQuery + useMutation pattern from useFactions.ts.
**When to use:** All components that read or write settings use these hooks.

```typescript
// Source: mirrors src/hooks/useFactions.ts pattern [VERIFIED: codebase]
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppSettings,
  upsertAppSetting,
  type AppSettingsMap,
} from "@/db/queries/appSettings";

export const APP_SETTINGS_KEY = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery<AppSettingsMap>({
    queryKey: APP_SETTINGS_KEY,
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000,     // 5 minutes — matches QueryProvider default
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation<void, Error, { key: string; value: string }>({
    mutationFn: ({ key, value }) => upsertAppSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY });
    },
  });
}
```

Note: `staleTime` can be omitted since the QueryProvider default is already 5 minutes. Including it is explicit and self-documenting — either approach is correct.

### Pattern 3: Migration File (044_app_settings.sql)

```sql
-- Migration 044: App Settings Key-Value Store
-- Flat key-value table for all user preferences and app settings.
-- All values stored as TEXT; type coercion happens in the TypeScript hook layer.
-- No seed data — defaults live in the hook layer (D-02).

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Pattern 4: lib.rs Registration

```rust
// Source: established pattern in src-tauri/src/lib.rs [VERIFIED: codebase]
// Insert AFTER version 43 block, BEFORE closing `]`
Migration {
    version: 44,
    description: "app_settings",
    sql: include_str!("../migrations/044_app_settings.sql"),
    kind: MigrationKind::Up,
},
```

### Pattern 5: SettingsPage Component

```typescript
// Source: 121-UI-SPEC.md (approved) + DataHealthPage.tsx pattern [VERIFIED: codebase]
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/useAppSettings";

export function SettingsPage() {
  const { isLoading, isError } = useAppSettings();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences" className="mt-4">
          {isLoading ? <Skeleton className="h-4 w-48" /> : isError ? (
            <p className="text-destructive text-sm">
              Could not load settings. Restart the app to try again.
            </p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Preferences</h2>
              <p className="text-muted-foreground text-sm">
                Language, currency, default faction, and points target — coming in the next update.
              </p>
            </>
          )}
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <h2 className="text-lg font-semibold">Data Management</h2>
          <p className="text-muted-foreground text-sm">
            Data health link, factory reset, and preference backup — coming in the next update.
          </p>
        </TabsContent>
        <TabsContent value="about" className="mt-4">
          <h2 className="text-lg font-semibold">About HobbyForge</h2>
          <p className="text-muted-foreground text-sm">
            App version, data statistics, and attribution — coming in the next update.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Note: The `isLoading`/`isError` guard is shown only on the Preferences tab per UI-SPEC (it is the default tab and the one most likely to need live data in Phase 122+). Data and About tabs are static placeholder content in this phase — no loading state needed.

### Anti-Patterns to Avoid

- **Seeding defaults in the migration:** D-02 explicitly requires no seed data. Defaults live in the hook layer. Violating this would cause the migration's SHA-384 checksum to be recalculated if seeds change, triggering the panic-on-startup safeguard in lib.rs.
- **Skipping `IF NOT EXISTS`:** All migrations in this codebase use `CREATE TABLE IF NOT EXISTS`. Omitting it makes the migration non-idempotent and will fail if somehow re-run.
- **Direct DB access from SettingsPage:** Architecture requires all DB calls to go through `src/db/queries/`. The page must only call hooks.
- **Skipping lib.rs registration:** The migration file alone is not enough. `lib.rs` `get_migrations()` must include the version 44 entry or the migration never runs at app startup.
- **Wrong parameterized syntax:** This codebase uses `$1, $2` (Tauri plugin-sql requirement), not `?` (sqlite3 style) or `:name` (named binding). Incorrect syntax causes a silent runtime error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert semantics | Custom SELECT + INSERT/UPDATE branching | `INSERT OR REPLACE` in SQL | SQLite's REPLACE handles the PRIMARY KEY conflict atomically; no race condition |
| Cache invalidation | Manual state synchronization | `queryClient.invalidateQueries` on `onSuccess` | React Query handles refetch, deduplication, and subscriber notification |
| Tab navigation | Custom state + conditional rendering | shadcn `Tabs` / Radix `TabsPrimitive` | Radix handles accessibility (ARIA roles, keyboard navigation) correctly |
| Type coercion | Storing typed columns per setting | TEXT column with hook-layer coercion | Avoids schema migrations every time a new setting type is added |

**Key insight:** The entire settings infrastructure is a thin adapter over SQLite + React Query. There is nothing novel to build — every piece maps directly to an existing pattern in the codebase.

---

## Common Pitfalls

### Pitfall 1: Migration version gap or collision

**What goes wrong:** Using a version number already registered (e.g., 43) causes a startup panic. Skipping numbers is harmless but confusing.
**Why it happens:** `lib.rs` registers migrations by integer version; tauri-plugin-sql detects duplicates.
**How to avoid:** Verify the last registered version in `lib.rs` is 43 (confirmed). Use version 44.
**Warning signs:** App fails to launch with a migration error mentioning duplicate version.

### Pitfall 2: SHA-384 checksum panic on file edit after first run

**What goes wrong:** Editing a migration file after it has been applied to any database causes a startup panic: "migration checksum mismatch".
**Why it happens:** tauri-plugin-sql stores SHA-384 checksums of applied migrations in `_sqlx_migrations`. Any change (including whitespace) invalidates the checksum.
**How to avoid:** Get the migration file correct before running `pnpm tauri dev` for the first time with it. Never edit an existing migration file.
**Warning signs:** Existing migration test files contain comments like "DDL only — no INSERTs (boot-loop prevention per migration 038 precedent)".

### Pitfall 3: Missing `INSERT OR REPLACE` coverage for `updated_at`

**What goes wrong:** `INSERT OR REPLACE` deletes the old row and inserts a new one. If `updated_at` has a `DEFAULT` clause, the replacement correctly uses `datetime('now')`. But if the INSERT statement omits `updated_at`, it gets the column default — which is correct behavior, but the intent should be explicit.
**How to avoid:** Include `updated_at = datetime('now')` in the VALUES clause of the upsert. [VERIFIED: all existing upsert-style queries in codebase include explicit timestamp]

### Pitfall 4: React Query `staleTime` not inherited from QueryProvider

**What goes wrong:** `useQuery` defaults to `staleTime: 0` unless explicitly set or the QueryProvider default overrides it. The app's `QueryProvider` sets `staleTime: 5 * 60 * 1000` as a global default, so it is technically inherited — but relying on the global default silently rather than being explicit is a maintenance risk.
**How to avoid:** Either explicitly set `staleTime` on the query (recommended for discoverability), or add a comment noting the global default covers it.
**Warning signs:** Settings refetch on every component mount (staleTime of 0).

### Pitfall 5: `SettingsPage` function name collision

**What goes wrong:** The existing `page.tsx` exports `SettingsPage`. The router imports it as `SettingsPage`. The replacement must export the same function name or the router import will break.
**How to avoid:** Keep the export name `SettingsPage` in the replacement file.

---

## Code Examples

### Existing migration registration (reference)

```rust
// Source: src-tauri/src/lib.rs lines 260–265 [VERIFIED: codebase]
Migration {
    version: 43,
    description: "udb_stratagems_enhancements",
    sql: include_str!("../migrations/043_udb_stratagems_enhancements.sql"),
    kind: MigrationKind::Up,
},
```

### Migration file shape (reference: 043)

```sql
-- Source: src-tauri/migrations/043_udb_stratagems_enhancements.sql [VERIFIED: codebase]
-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).

CREATE TABLE IF NOT EXISTS udb_stratagems (
  id            TEXT PRIMARY KEY,
  ...
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Existing hook invalidation pattern

```typescript
// Source: src/hooks/useFactions.ts [VERIFIED: codebase]
export function useCreateFaction() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateFactionInput>({
    mutationFn: createFaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FACTIONS_KEY });
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| `PlaceholderPage` stub at `/settings` | Real `SettingsPage` with tab shell | This phase executes the replacement |
| No settings persistence (localStorage only in some features) | `app_settings` SQLite table | Enables cross-session, cross-feature preference storage |

**Deprecated/outdated:**
- `PlaceholderPage` component usage in `src/app/settings/page.tsx`: replaced by Phase 121.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | All claims in this research were verified by direct codebase inspection or locked by CONTEXT.md decisions. No assumed claims. | — | — |

---

## Open Questions

None. All decisions are locked in CONTEXT.md. All patterns are verified in the codebase. The UI-SPEC is approved and fully specifies the visual contract.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 121 is code/config-only changes (SQL migration + TypeScript files). No external tools, services, or CLIs beyond the existing project stack are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/settings/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INF-01 | `044_app_settings.sql` has `CREATE TABLE IF NOT EXISTS app_settings` with correct schema; `lib.rs` registers version 44 | File content (no IPC) | `pnpm test -- tests/settings/migration044.test.ts` | Wave 0 |
| INF-01 | Migration contains no DROP or ALTER TABLE (additive-only) | File content | same file | Wave 0 |
| INF-02 | `APP_SETTINGS_KEY` equals `["app-settings"]` | Unit | `pnpm test -- tests/settings/useAppSettings.test.ts` | Wave 0 |
| INF-02 | `useUpdateSetting` `onSuccess` invalidates `APP_SETTINGS_KEY` | Unit (renderHook + spy) | same file | Wave 0 |
| INF-03 | `SettingsPage` renders h1 "Settings" | Component render | `pnpm test -- tests/settings/SettingsPage.test.tsx` | Wave 0 |
| INF-03 | Three tabs visible: Preferences, Data, About | Component render | same file | Wave 0 |
| INF-03 | Default active tab is Preferences | Component render | same file | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/settings/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/settings/migration044.test.ts` — covers INF-01 (file content + lib.rs registration)
- [ ] `tests/settings/useAppSettings.test.ts` — covers INF-02 (key constant + invalidation contract)
- [ ] `tests/settings/SettingsPage.test.tsx` — covers INF-03 (renders, 3 tabs, default tab)

---

## Security Domain

`security_enforcement` is not explicitly set to `false` in config.json — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Low — keys/values are app-controlled strings | No user-supplied keys in Phase 121; Phase 122+ must validate key names against an allowlist |
| V6 Cryptography | No | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via key/value strings | Tampering | Parameterized queries `$1, $2` — already enforced by codebase pattern |
| Unbounded value length | DoS | Not a concern for Phase 121 (no user input); Phase 122+ should validate string length |

No threat surface in Phase 121: the settings table is written by application code only (no user-typed keys), and the page is a read-only shell with no input fields.

---

## Sources

### Primary (HIGH confidence)

- `src/db/queries/factions.ts` — Reference query module; all patterns verified by direct read
- `src/hooks/useFactions.ts` — Reference hook file; KEY constant, useQuery, useMutation, invalidation patterns
- `src/db/client.ts` — DB singleton; `getDb()`, WAL mode, FK pragma
- `src/components/ui/tabs.tsx` — shadcn Tabs component; confirmed installed, API verified
- `src-tauri/src/lib.rs` — Migration registration pattern; version 43 confirmed as last entry
- `src-tauri/migrations/043_udb_stratagems_enhancements.sql` — Migration file shape reference
- `.planning/phases/121-settings-foundation/121-UI-SPEC.md` — Approved UI contract
- `.planning/phases/121-settings-foundation/121-CONTEXT.md` — Locked decisions

### Secondary (MEDIUM confidence)

None needed — all patterns resolved from codebase directly.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages; all existing
- Architecture: HIGH — four-layer architecture is established and verified
- Migration pattern: HIGH — verified against 43 existing migrations and lib.rs
- Pitfalls: HIGH — derived from codebase inspection (checksum comment in migration 038, existing tests)
- Test patterns: HIGH — verified against multiple existing test files

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable stack — no fast-moving dependencies)
