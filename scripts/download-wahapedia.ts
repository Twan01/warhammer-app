/**
 * Dev-side script: download Wahapedia CSV files to scripts/data/.
 *
 * Per D-02, D-03, D-04:
 * - Downloads all 10 required CSVs from wahapedia.ru/wh40k10ed/
 * - Separate from build:udb — deterministic builds require pre-fetched CSVs
 * - Uses Node.js built-in fetch, no new HTTP dependency
 * - Skips existing files unless --force is passed
 * - Does not silently write empty files on HTTP failure
 *
 * Usage:
 *   node --experimental-strip-types scripts/download-wahapedia.ts
 *   pnpm download:wahapedia
 *   pnpm download:wahapedia -- --force   # re-download all files
 */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "data");
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
const BASE_URL = "https://wahapedia.ru/wh40k10ed/";

const CSV_FILES = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Datasheets_models_cost.csv",
  "Stratagems.csv",
  "Enhancements.csv",
  "Detachment_abilities.csv",
];

const force = process.argv.includes("--force");

console.log("=== Wahapedia CSV Download ===");
console.log(`Data dir : ${DATA_DIR}`);
console.log(`Force    : ${force}`);
console.log("");

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const csvFile of CSV_FILES) {
  const dest = join(DATA_DIR, csvFile);

  if (existsSync(dest) && !force) {
    console.log(`  [skip] ${csvFile} (already exists; use --force to re-download)`);
    skipped++;
    continue;
  }

  const url = BASE_URL + csvFile;
  console.log(`  [fetch] ${csvFile} ...`);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "HobbyForge-UDB-Builder/1.0",
      },
    });

    if (!res.ok) {
      console.error(`  [error] ${csvFile}: HTTP ${res.status} ${res.statusText}`);
      failed++;
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buffer);
    const kb = (buffer.byteLength / 1024).toFixed(1);
    console.log(`  [done]  ${csvFile} (${kb} KB)`);
    downloaded++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [error] ${csvFile}: ${message}`);
    failed++;
  }
}

console.log("");
console.log(
  `=== Summary: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed ===`
);

if (failed > 0) {
  process.exit(1);
}
