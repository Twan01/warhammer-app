import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const tauri = JSON.parse(readFileSync(resolve(root, 'src-tauri', 'tauri.conf.json'), 'utf-8'));

if (pkg.version === tauri.version) {
  console.log(`Version parity OK: ${pkg.version}`);
  process.exit(0);
} else {
  console.error(`Version mismatch! package.json=${pkg.version}, tauri.conf.json=${tauri.version}`);
  process.exit(1);
}
