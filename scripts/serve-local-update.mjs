/**
 * serve-local-update.mjs
 *
 * LOCAL-TEST-ONLY — REL-06 local update server.
 * Serves the NSIS bundle directory (latest.json + *-setup.exe) over HTTP
 * on localhost using Node's built-in `node:http` module.
 *
 * Does NOT use `npx serve` (unpinned auto-download, RESEARCH SUS note).
 *
 * Usage:
 *   node scripts/serve-local-update.mjs [--port <PORT>] [--bundle-dir <dir>]
 *
 * Defaults:
 *   --port        5183
 *   --bundle-dir  src-tauri/target/release/bundle/nsis
 *
 * The server also serves latest.json from the repo root (written by
 * make-local-update.mjs) — it checks the root first, then the bundle dir.
 *
 * Stop with Ctrl+C.
 */

import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { resolve, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --- Parse CLI args ---
const args = process.argv.slice(2);
let port = 5183;
let bundleDir = resolve(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[++i], 10);
  } else if (args[i] === '--bundle-dir' && args[i + 1]) {
    bundleDir = resolve(args[++i]);
  }
}

// --- MIME types ---
const MIME = {
  '.json': 'application/json',
  '.exe':  'application/octet-stream',
  '.sig':  'text/plain',
};

function getMime(filePath) {
  return MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

// --- Resolve a request path to a file path ---
// Search order: repo root (for latest.json), then bundle dir.
function resolveFile(urlPath) {
  // Decode and strip leading slash; reject path traversal.
  const decoded = decodeURIComponent(urlPath.replace(/^\/+/, ''));
  if (decoded.includes('..') || decoded.includes('\0')) return null;

  // latest.json comes from the repo root (where make-local-update writes it).
  if (decoded === 'latest.json') {
    const rootJson = resolve(root, 'latest.json');
    if (existsSync(rootJson)) return rootJson;
  }

  // Everything else (setup.exe, .sig) comes from the bundle dir.
  const candidate = resolve(bundleDir, decoded);
  // Security: ensure the resolved path is inside bundleDir.
  if (!candidate.startsWith(bundleDir + '\\') && candidate !== bundleDir) {
    // Also allow forward-slash prefix on POSIX.
    if (!candidate.startsWith(bundleDir + '/') && candidate !== bundleDir) {
      return null;
    }
  }
  if (existsSync(candidate)) return candidate;

  return null;
}

// --- HTTP server ---
const server = createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] ?? '/';

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveFile(urlPath);
  if (!filePath) {
    console.log(`[serve-local-update] 404 ${req.method} ${urlPath}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const mime = getMime(filePath);
  const fileSize = stat.size;

  // --- Range support (needed for large .exe downloads) ---
  const rangeHeader = req.headers['range'];
  if (rangeHeader) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end   = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      if (start > end || end >= fileSize) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
        res.end();
        return;
      }
      const chunkSize = end - start + 1;
      console.log(`[serve-local-update] 206 ${req.method} ${urlPath} (${start}-${end}/${fileSize})`);
      res.writeHead(206, {
        'Content-Type':   mime,
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
      });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = createReadStream(filePath, { start, end });
      stream.on('error', (err) => {
        console.error(`[serve-local-update] Stream error: ${err.message}`);
        res.destroy();
      });
      stream.pipe(res);
      return;
    }
  }

  console.log(`[serve-local-update] 200 ${req.method} ${urlPath} (${fileSize} bytes)`);
  res.writeHead(200, {
    'Content-Type':   mime,
    'Content-Length': fileSize,
    'Accept-Ranges':  'bytes',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = createReadStream(filePath);
  stream.on('error', (err) => {
    console.error(`[serve-local-update] Stream error: ${err.message}`);
    res.destroy();
  });
  stream.pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve-local-update] Listening on http://localhost:${port}`);
  console.log(`[serve-local-update] Bundle dir: ${bundleDir}`);
  console.log(`[serve-local-update] Serving:`);
  console.log(`  http://localhost:${port}/latest.json         (from repo root)`);
  console.log(`  http://localhost:${port}/<name>-setup.exe    (from bundle dir)`);
  console.log('');
  console.log('[serve-local-update] Press Ctrl+C to stop.');
});

server.on('error', (err) => {
  console.error(`[serve-local-update] Server error: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error(`  Port ${port} is already in use. Use --port <PORT> to pick another.`);
  }
  process.exit(1);
});
