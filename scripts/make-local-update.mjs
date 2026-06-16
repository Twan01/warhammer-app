/**
 * make-local-update.mjs
 *
 * LOCAL-TEST-ONLY — REL-06 local two-build verification helper.
 * Assembles a signed `latest.json` for a local NSIS update test.
 *
 * NEVER run this as part of a production release. The companion
 * `src-tauri/local-update.json` override file (consumed via
 * `pnpm tauri build --config src-tauri/local-update.json`) is what
 * routes the app to localhost — the committed tauri.conf.json is
 * NEVER edited (D-03).
 *
 * Usage:
 *   node scripts/make-local-update.mjs [--port <PORT>] [--out <dir>]
 *
 * Defaults:
 *   --port  5183   (the port serve-local-update.mjs uses)
 *   --out   .      (output latest.json to the repo root)
 *
 * What this script does:
 *   1. Reads the current app version from tauri.conf.json.
 *   2. Locates the *-setup.exe and *.sig beside it in
 *      src-tauri/target/release/bundle/nsis/.
 *   3. Reads the ENTIRE contents of the *.sig file — that IS the
 *      `signature` value in latest.json (do NOT re-sign; the file
 *      produced by createUpdaterArtifacts:true is authoritative).
 *   4. Emits latest.json with the windows-x86_64 platform entry.
 *
 * Signing setup (run BEFORE building vN+1):
 *
 *   Option A — production key available locally:
 *     export TAURI_SIGNING_PRIVATE_KEY="<contents of production private key>"
 *     export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password>"
 *     (no pubkey override needed in local-update.json — use real pubkey)
 *
 *   Option B — production key NOT available (CI-only secret):
 *     pnpm tauri signer generate -- -w ./throwaway.key
 *     # copy the printed public key into src-tauri/local-update.json "pubkey"
 *     export TAURI_SIGNING_PRIVATE_KEY="$(cat ./throwaway.key)"
 *     export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
 *
 * Build command (vN+1, with the local-update override):
 *   TAURI_SIGNING_PRIVATE_KEY="..." \
 *   TAURI_SIGNING_PRIVATE_KEY_PASSWORD="..." \
 *   pnpm tauri build --config src-tauri/local-update.json
 *
 * After building, run this script, then start the server:
 *   node scripts/make-local-update.mjs
 *   node scripts/serve-local-update.mjs
 *
 * Then launch the vN app (also built with --config src-tauri/local-update.json)
 * and trigger the in-app update check.
 *
 * Config safety check (D-03) — run after the test:
 *   git diff --exit-code src-tauri/tauri.conf.json
 *   # Must exit 0 (no changes). If it has changes, something went wrong.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --- Parse CLI args ---
const args = process.argv.slice(2);
let port = 5183;
let outDir = root;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[++i], 10);
  } else if (args[i] === '--out' && args[i + 1]) {
    outDir = resolve(args[++i]);
  }
}

// --- Read version from tauri.conf.json ---
const tauriConfPath = resolve(root, 'src-tauri', 'tauri.conf.json');
let version;
try {
  const tauri = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
  version = tauri.version;
} catch (err) {
  console.error(`[make-local-update] ERROR: Could not read tauri.conf.json: ${err.message}`);
  process.exit(1);
}

if (!version) {
  console.error('[make-local-update] ERROR: version not found in tauri.conf.json');
  process.exit(1);
}
console.log(`[make-local-update] App version: ${version}`);

// --- Locate NSIS bundle dir ---
const nsisDir = resolve(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
if (!existsSync(nsisDir)) {
  console.error(
    `[make-local-update] ERROR: NSIS bundle dir not found: ${nsisDir}\n` +
    `  Run: pnpm tauri build --config src-tauri/local-update.json`
  );
  process.exit(1);
}

// --- Find *-setup.exe and *.sig ---
let files;
try {
  files = readdirSync(nsisDir);
} catch (err) {
  console.error(`[make-local-update] ERROR: Cannot read NSIS dir: ${err.message}`);
  process.exit(1);
}

const setupExe = files.find((f) => f.endsWith('-setup.exe'));
const sigFile = files.find((f) => f.endsWith('-setup.exe.sig'));

if (!setupExe) {
  console.error(
    `[make-local-update] ERROR: No *-setup.exe found in ${nsisDir}\n` +
    `  Run: pnpm tauri build --config src-tauri/local-update.json`
  );
  process.exit(1);
}

if (!sigFile) {
  console.error(
    `[make-local-update] ERROR: No *-setup.exe.sig found in ${nsisDir}\n` +
    `  Ensure TAURI_SIGNING_PRIVATE_KEY is set when building, and\n` +
    `  createUpdaterArtifacts:true is in tauri.conf.json (it is).`
  );
  process.exit(1);
}

console.log(`[make-local-update] Installer: ${setupExe}`);
console.log(`[make-local-update] Signature: ${sigFile}`);

// --- Read the ENTIRE .sig file — this IS the signature value ---
const sigPath = resolve(nsisDir, sigFile);
const signature = readFileSync(sigPath, 'utf-8').trim();

if (!signature) {
  console.error(`[make-local-update] ERROR: Signature file is empty: ${sigPath}`);
  process.exit(1);
}

// --- Build latest.json ---
const url = `http://localhost:${port}/${encodeURIComponent(setupExe)}`;
const pubDate = new Date().toISOString();

const latestJson = {
  version,
  notes: 'Local update verification build (REL-06)',
  pub_date: pubDate,
  platforms: {
    'windows-x86_64': {
      signature,
      url,
    },
  },
};

// --- Write latest.json ---
const outPath = resolve(outDir, 'latest.json');
try {
  writeFileSync(outPath, JSON.stringify(latestJson, null, 2) + '\n', 'utf-8');
} catch (err) {
  console.error(`[make-local-update] ERROR: Could not write ${outPath}: ${err.message}`);
  process.exit(1);
}

console.log(`[make-local-update] Written: ${outPath}`);
console.log(`[make-local-update] Platform: windows-x86_64`);
console.log(`[make-local-update] URL:      ${url}`);
console.log('');
console.log('[make-local-update] Next steps:');
console.log(`  1. Start the local update server:`);
console.log(`       node scripts/serve-local-update.mjs`);
console.log(`  2. Launch the vN app (built with --config src-tauri/local-update.json).`);
console.log(`  3. Trigger the in-app update check.`);
console.log(`  4. After the update completes, run:`);
console.log(`       git diff --exit-code src-tauri/tauri.conf.json`);
console.log(`     It must exit 0 (D-03 config-safety check).`);

process.exit(0);
