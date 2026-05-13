Create a new SQL migration for HobbyForge. Description: $ARGUMENTS

## Steps

1. **Read the migrations directory** to find what already exists:
   ```
   src-tauri/migrations/
   ```
   List all `.sql` files and identify the highest sequence number for each database.

2. **Determine target database** — ask if unclear:
   - `hobbyforge.db` — app data (units, paints, factions, army lists, etc.) — migrations numbered `001` through `NNN`
   - `rules.db` — Wahapedia game rules (CSV-synced) — migrations prefixed `rules_001`, `rules_002`, etc.

3. **Compute the next filename**:
   - For hobbyforge.db: next number after the highest `NNN_*.sql` → e.g. `009_<slug>.sql`
   - For rules.db: next number after the highest `rules_NNN_*.sql` → e.g. `rules_003_<slug>.sql`
   - Slug: lowercase, underscores, derived from the description argument

4. **Write the migration file** at `src-tauri/migrations/<filename>`:

   ```sql
   -- Migration: <filename>
   -- Target: hobbyforge.db (or rules.db)
   -- Purpose: <one-line description from argument>
   --
   -- IMPORTANT: Never edit this file after it has run in any environment.
   -- Add a new migration instead.

   -- Your SQL here
   ```

   Follow these patterns based on what you're doing:
   - **New table**: include all columns, PRIMARY KEY, FOREIGN KEY constraints, and `created_at`/`updated_at` with `datetime('now')` defaults
   - **Add column**: `ALTER TABLE t ADD COLUMN col TYPE DEFAULT value` — SQLite cannot remove columns, so think carefully
   - **Rename**: SQLite doesn't support RENAME COLUMN before 3.25 — use a recreate pattern only if truly needed
   - **Seed data**: `INSERT OR IGNORE INTO ...` to be idempotent

5. **Remind the user**:
   - The migration runs automatically at next app start (Tauri plugin-sql handles ordering by filename)
   - `PRAGMA foreign_keys` is ON when app runs but OFF during migration — add explicit FK checks in migration if needed
   - Never edit this file again once committed; add a follow-up migration if corrections are needed
   - Booleans are stored as `INTEGER` (`0` or `1`) — use `INTEGER NOT NULL DEFAULT 0` for boolean columns

6. **Show the full file content** before writing so the user can review it.
