Audit all HobbyForge database query files for common pitfalls specific to this project.

## Steps

1. **Read every file** in `src/db/queries/` (there are ~14 files).

2. **Check each file for these three issues**:

   ### Issue 1: Wrong parameterization syntax
   Tauri plugin-sql requires **positional `$1, $2` syntax** — never `?` placeholders or `:named` params.
   - Flag any query string containing `?` as a placeholder (not inside a string literal)
   - Flag any query string containing `:param` style bindings
   - Flag any query string that has more `$N` params than the bound array has elements (or vice versa)

   ### Issue 2: Boolean casting errors
   Booleans are stored as `INTEGER (0 or 1)` in SQLite.
   - **Reads**: any boolean column returned from `db.select` must be cast: `Boolean(row.field)` or `!!row.field`
     - Flag fields that look boolean (named `is_*`, `has_*`, `owned`, `running_low`, `wishlist`, `active`, `enabled`) but are used directly as `boolean` in TypeScript without casting
   - **Writes**: boolean values passed to `db.execute` must use `value ? 1 : 0`
     - Flag boolean-named fields passed directly without the ternary

   ### Issue 3: Unguarded FK-dependent deletes
   When a delete may fail due to a foreign key constraint, the caller needs to be able to distinguish the error.
   - Flag any `delete` function that does NOT have a comment noting FK behavior
   - Flag any delete that catches errors internally and swallows them (should let them propagate to the component for toast handling)

3. **Report findings** in this format:

   ```
   src/db/queries/someFile.ts
     ✗ Issue 1 – Line 42: query uses "?" placeholder instead of "$1"
     ✗ Issue 2 – Line 67: "owned" field read without Boolean() cast
     ✓ Issue 3 – delete propagates correctly

   src/db/queries/cleanFile.ts
     ✓ All checks pass
   ```

4. **Offer to fix** any issues found. Fix them one file at a time, reading the current content before editing.

Do not fix anything without reporting it first.
