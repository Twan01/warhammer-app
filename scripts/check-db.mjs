import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.env.APPDATA, 'com.hobbyforge.app', 'hobbyforge.db');
const rulesPath = join(process.env.APPDATA, 'com.hobbyforge.app', 'rules.db');

console.log('DB path:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  console.log('\n=== Integrity ===');
  console.log(db.pragma('integrity_check'));

  console.log('\n=== Migration status ===');
  const migrations = db.prepare('SELECT version, success, description FROM _sqlx_migrations ORDER BY version').all();
  migrations.forEach(m => console.log(`  v${m.version}: success=${m.success} desc=${m.description}`));

  console.log('\n=== Tables ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => console.log(`  ${t.name}`));

  console.log('\n=== Key table schemas ===');
  for (const table of ['army_list_units', 'army_lists', 'collection_units']) {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all();
      console.log(`\n  ${table}:`, info.map(c => `${c.name}(${c.type})`).join(', '));
    } catch(e) {
      console.log(`\n  ${table}: ERROR - ${e.message}`);
    }
  }

  console.log('\n=== Data counts ===');
  for (const table of ['factions', 'units', 'army_lists', 'army_list_units', 'collection_units']) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get();
      console.log(`  ${table}: ${row.cnt}`);
    } catch(e) {
      console.log(`  ${table}: ERROR - ${e.message}`);
    }
  }

  db.close();
} catch(e) {
  console.error('hobbyforge.db error:', e.message);
}

try {
  const rdb = new Database(rulesPath, { readonly: true });
  console.log('\n=== rules.db Integrity ===');
  console.log(rdb.pragma('integrity_check'));
  const tables = rdb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));
  rdb.close();
} catch(e) {
  console.error('rules.db error:', e.message);
}
