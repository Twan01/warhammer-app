---
phase: 121-settings-foundation
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src-tauri/migrations/044_app_settings.sql
  - src/db/queries/appSettings.ts
  - src/hooks/useAppSettings.ts
  - src/app/settings/page.tsx
  - tests/settings/migration044.test.ts
  - tests/settings/useAppSettings.test.ts
  - tests/settings/SettingsPage.test.tsx
  - src-tauri/src/lib.rs
  - tests/data-layer/db-helpers.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 121: Code Review Report

**Reviewed:** 2026-06-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 121 delivers the settings infrastructure: a key-value `app_settings` table
(migration 044), a pair of query functions, a React Query hook layer, and a
scaffold `SettingsPage` with three tabs. The migration is correctly wired into
`lib.rs` and `db-helpers.ts`. No critical bugs or security vulnerabilities were
found. Three warnings and two informational items are noted below.

---

## Warnings

### WR-01: `upsertAppSetting` silently truncates `updated_at` on duplicate-key replace

**File:** `src/db/queries/appSettings.ts:27-30`

**Issue:** `INSERT OR REPLACE` in SQLite deletes the old row then inserts a new
one. Because the migration defines `updated_at` with `DEFAULT (datetime('now'))`,
and the upsert explicitly supplies `datetime('now')` for `updated_at`, this is
fine for the current use-case. However, the `getAppSetting` query (line 13) and
`getAppSettings` query (line 6) never surface `updated_at` to the caller. If any
future code needs to compare or display the last-modified timestamp, there is no
query path to retrieve it, making the column effectively write-only at the query
layer. The column should either be included in the read API now, or the column
should be documented as internal-only to avoid confusion.

**Fix:** Add `updated_at` to `getAppSetting` return type and `AppSettingsMap`
value, or add a JSDoc comment explicitly marking it as an internal audit column
not intended for callers:

```ts
// Option A — surface updated_at in the single-key query
export async function getAppSetting(
  key: string,
): Promise<{ value: string; updatedAt: string } | null> {
  const rows = await db.select<{ value: string; updated_at: string }[]>(
    "SELECT value, updated_at FROM app_settings WHERE key = $1",
    [key],
  );
  if (!rows[0]) return null;
  return { value: rows[0].value, updatedAt: rows[0].updated_at };
}

// Option B — keep current API but add comment
/**
 * updated_at is maintained by the DB for audit purposes and is not
 * exposed via this query layer intentionally.
 */
export async function getAppSettings(): Promise<AppSettingsMap> { ... }
```

---

### WR-02: `SettingsPage` loads settings data it never uses

**File:** `src/app/settings/page.tsx:6`

**Issue:** `useAppSettings()` is called on line 6 and only `isLoading` and
`isError` are destructured. The `data` field is never consumed. The Preferences
tab content is entirely static placeholder text — the real settings values are
not read or rendered. This means the hook fires a DB query on every settings page
visit for no functional benefit in this phase. If the intent is to show a loading
skeleton while the DB initialises, the hook call is appropriate but should be
commented as intentional. If the page is meant to be entirely static in this
phase, the hook call is dead code that will mislead the reader.

More concretely: the `isError` branch is shown only inside the
`TabsContent value="preferences"` panel. If the query errors, the **Data** and
**About** tabs render static placeholder text with no indication of the error
state, which is inconsistent.

**Fix — at minimum, document the intent:**
```tsx
// Prefetch settings so the DB connection is warm when actual preference
// controls are added in phase 122. isLoading/isError guard the preferences tab.
const { isLoading, isError } = useAppSettings();
```

Or, if this phase truly should not need the data, remove the hook call entirely
and use a static page, deferring the data dependency to the phase that adds real
controls.

---

### WR-03: `upsertAppSetting` has no key length or value length guard

**File:** `src/db/queries/appSettings.ts:22-31`

**Issue:** The `key` and `value` parameters are accepted as arbitrary-length
`string`. The SQLite column is `TEXT NOT NULL` with no `CHECK` constraint in the
migration. While this is a desktop app with no untrusted remote input, other
parts of this codebase use Zod validation at the form/hook boundary (project
convention). A malformed key (e.g. empty string `""`) would silently insert a
row with an empty primary key — valid in SQLite but nonsensical semantically.
The project convention uses `z.string().min(1)` guards at the schema layer.

**Fix:** Add a runtime guard in `upsertAppSetting`, or validate at the call
site in the hook:
```ts
export async function upsertAppSetting(
  key: string,
  value: string,
): Promise<void> {
  if (!key) throw new Error("app_settings key must not be empty");
  const db = await getDb();
  await db.execute(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))",
    [key, value],
  );
}
```

---

## Info

### IN-01: Migration 044 `updated_at` default is not updated on `INSERT OR REPLACE`

**File:** `src-tauri/migrations/044_app_settings.sql:7`

**Issue:** The column default `DEFAULT (datetime('now'))` fires only on `INSERT`,
not on the implicit delete-then-insert of `INSERT OR REPLACE`. In the upsert
query (`appSettings.ts:28`), `updated_at` is explicitly passed as
`datetime('now')`, so this is handled correctly in the current code. But the
table DDL gives the impression that `updated_at` will auto-maintain itself. A
future developer writing a bare `INSERT OR IGNORE` (without the explicit
`updated_at` column) will get the correct initial timestamp; but if they rely on
`DEFAULT` to auto-update on replace, it will silently not update. Consider
adding a comment in the migration to document the explicit-column requirement:

```sql
-- updated_at must be supplied explicitly in upserts; the DEFAULT only fires
-- on plain INSERT (not on the re-insert leg of INSERT OR REPLACE).
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
```

---

### IN-02: `migration044.test.ts` upsert test does not verify `updated_at` is refreshed

**File:** `tests/settings/migration044.test.ts:43-59`

**Issue:** The upsert test (lines 43–59) verifies the value is updated to
`"dark"` but does not assert that `updated_at` was refreshed on the second
write. This means a regression where the explicit `updated_at` column is dropped
from the upsert query in `appSettings.ts` would not be caught by tests.

**Fix:** Extend the upsert test:
```ts
it("INSERT OR REPLACE upsert refreshes updated_at", () => {
  const db = createHobbyforgeDb();
  db.prepare(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('ts-test', 'v1', '2000-01-01 00:00:00')",
  ).run();
  db.prepare(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('ts-test', 'v2', datetime('now'))",
  ).run();
  const row = db
    .prepare("SELECT updated_at FROM app_settings WHERE key = 'ts-test'")
    .get() as { updated_at: string } | undefined;
  db.close();
  expect(row?.updated_at).not.toBe("2000-01-01 00:00:00");
});
```

---

_Reviewed: 2026-06-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
