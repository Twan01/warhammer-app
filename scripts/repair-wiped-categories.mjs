/**
 * One-time repair: restore Category on units that were wiped by the partial-update
 * bug (fixed in commit fd74f9aa). Before that fix, setting a unit "active" — or any
 * other partial updateUnit call (Kanban drag, painting-status popover, tier confirm,
 * etc.) — overwrote the unit's `category` (and other fields) to NULL.
 *
 * Recovery source: the linked canonical datasheet's role. This is exactly what the
 * collection uses when a unit is first added from the database browser
 * (DatabaseBrowserPage.tsx: `category: unit.role ?? ""`), so it restores the value the
 * unit would have had at import time. User customisations made AFTER import (e.g. a
 * role of "Other" relabelled to "Elite") cannot be recovered — they weren't recorded
 * anywhere. Units with no datasheet link are skipped (nothing to derive from).
 *
 * Usage:
 *   node scripts/repair-wiped-categories.mjs          # dry run — shows what WOULD change
 *   node scripts/repair-wiped-categories.mjs --apply   # actually writes the changes
 *
 * A timestamped backup of hobbyforge.db is written next to it before any --apply write.
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { copyFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const dbPath = join(process.env.APPDATA, 'com.hobbyforge.app', 'hobbyforge.db');

console.log(`HobbyForge category repair — ${APPLY ? 'APPLY' : 'DRY RUN'}`);
console.log('DB:', dbPath, '\n');

const db = new Database(dbPath); // read-write; we only write when --apply

// Units with a missing category that still have a datasheet link to recover from.
const candidates = db
  .prepare(
    `SELECT u.id, u.name, u.category, d.role AS recovered
       FROM units u
       JOIN udb_units d ON d.id = u.udb_unit_id
      WHERE (u.category IS NULL OR u.category = '')
        AND d.role IS NOT NULL AND d.role != ''
      ORDER BY u.id`,
  )
  .all();

// Units with a missing category but no link / no role — cannot be repaired automatically.
const unrecoverable = db
  .prepare(
    `SELECT u.id, u.name, u.udb_unit_id
       FROM units u
       LEFT JOIN udb_units d ON d.id = u.udb_unit_id
      WHERE (u.category IS NULL OR u.category = '')
        AND (u.udb_unit_id IS NULL OR d.role IS NULL OR d.role = '')
      ORDER BY u.id`,
  )
  .all();

if (candidates.length === 0) {
  console.log('No repairable units found — every unit with a blank category lacks a datasheet role to recover from, or none are blank.');
} else {
  console.log(`${candidates.length} unit(s) can be repaired:\n`);
  for (const r of candidates) {
    console.log(`  #${r.id}  ${JSON.stringify(r.name).padEnd(34)} category: (blank) -> ${JSON.stringify(r.recovered)}`);
  }
}

if (unrecoverable.length > 0) {
  console.log(`\n${unrecoverable.length} unit(s) have a blank category but no datasheet role to recover from (skipped — fix manually):`);
  for (const r of unrecoverable) {
    console.log(`  #${r.id}  ${JSON.stringify(r.name)} (udb_unit_id=${JSON.stringify(r.udb_unit_id)})`);
  }
}

if (!APPLY) {
  console.log('\nDry run — no changes written. Re-run with --apply to commit these repairs.');
  db.close();
  process.exit(0);
}

if (candidates.length === 0) {
  db.close();
  process.exit(0);
}

// Backup before mutating.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `${dbPath}.pre-category-repair-${stamp}.bak`;
copyFileSync(dbPath, backupPath);
console.log(`\nBackup written: ${backupPath}`);

const update = db.prepare(
  `UPDATE units SET category = $role, updated_at = datetime('now') WHERE id = $id`,
);
const apply = db.transaction((rows) => {
  for (const r of rows) update.run({ role: r.recovered, id: r.id });
});
apply(candidates);

console.log(`\nDone — repaired ${candidates.length} unit(s).`);
db.close();
