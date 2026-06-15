import Database from 'better-sqlite3';
import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

const dbPath = join(process.env.APPDATA, 'com.hobbyforge.app', 'hobbyforge.db');
const migDir = join(process.cwd(), 'src-tauri', 'migrations');

const files = readdirSync(migDir).filter(f => f.endsWith('.sql'));
const byVersion = new Map();
for (const f of files) {
  const m = f.match(/^(\d+)_/);
  if (m) byVersion.set(parseInt(m[1], 10), f);
}

const db = new Database(dbPath, { readonly: true });
const rows = db.prepare('SELECT version, success, checksum, description FROM _sqlx_migrations ORDER BY version').all();

function sha384(buf) { return createHash('sha384').update(buf).digest(); }

for (const r of rows) {
  const file = byVersion.get(r.version);
  if (!file) continue;
  const raw = readFileSync(join(migDir, file));
  const lf = raw; // as-is (LF on disk)
  const crlf = Buffer.from(raw.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  const stored = Buffer.from(r.checksum);
  const matchLF = stored.equals(sha384(lf));
  const matchCRLF = stored.equals(sha384(crlf));
  const hasCRLF = raw.includes(0x0d);
  console.log(`v${String(r.version).padStart(2)} LF=${matchLF?'Y':'n'} CRLF=${matchCRLF?'Y':'n'} fileHasCR=${hasCRLF} bytes=${raw.length}`);
}
db.close();
