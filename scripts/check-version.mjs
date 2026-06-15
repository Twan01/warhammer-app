import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const tauri = JSON.parse(readFileSync(resolve(root, 'src-tauri', 'tauri.conf.json'), 'utf-8'));

let failed = false;

// --- Leg 1: Version parity (package.json <-> tauri.conf.json) ---
if (pkg.version === tauri.version) {
  console.log(`[version] OK: ${pkg.version}`);
} else {
  console.error(`[version] MISMATCH: package.json=${pkg.version}, tauri.conf.json=${tauri.version}`);
  failed = true;
}

// --- Leg 2: Migration-count parity (disk .sql files <-> lib.rs Migration{} entries) ---
//
// D-05 transitive chain (do NOT import db-helpers.ts here):
//   - This gate asserts: fileCount (disk) === libRsCount (lib.rs Migration{} structs)
//   - Vitest migration-parity.test.ts D-06 asserts: libRsCount === HOBBYFORGE_MIGRATION_COUNT
//   - After Plan 01, HOBBYFORGE_MIGRATION_COUNT === fileCount by construction (disk-derived)
//   Therefore all three values agree without importing the .ts helper into this .mjs
//   (avoids --experimental-strip-types and better-sqlite3 in the gate — CI-ready).
//
const libRs = readFileSync(resolve(root, 'src-tauri', 'src', 'lib.rs'), 'utf-8');
const libRsCount = (libRs.match(/Migration\s*\{/g) ?? []).length;
const migrationsDir = resolve(root, 'src-tauri', 'migrations');
const fileCount = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;

if (fileCount === libRsCount) {
  console.log(`[migration-count] OK: ${fileCount} .sql files === ${libRsCount} Migration{} entries in lib.rs`);
} else {
  console.error(`[migration-count] MISMATCH: ${fileCount} .sql files on disk, ${libRsCount} Migration{} entries in lib.rs`);
  failed = true;
}

// --- Leg 3: CR-byte scan (migrations must be LF-only — CRLF breaks _sqlx_migrations SHA-384) ---
const offenders = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => readFileSync(resolve(migrationsDir, f)).includes(0x0d));

if (offenders.length === 0) {
  console.log(`[cr-byte] OK: no CR bytes in any migration file`);
} else {
  console.error(`[cr-byte] FAIL: CR byte (0x0D) found in migration file(s): ${offenders.join(', ')}`);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  process.exit(0);
}
