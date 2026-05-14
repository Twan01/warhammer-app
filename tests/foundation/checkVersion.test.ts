/**
 * Gap 4 — check-version.mjs behavioral assertions.
 *
 * Verifies: script reads both package.json and tauri.conf.json, compares
 * versions, exits 0 on match, exits 1 with a descriptive error on mismatch.
 *
 * Uses child_process.spawnSync to execute the script directly as Node would —
 * this tests the actual exit-code and output behavior, not just file content.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = resolve(repoRoot, "scripts/check-version.mjs");
const packageJsonPath = resolve(repoRoot, "package.json");
const tauriConfPath = resolve(repoRoot, "src-tauri/tauri.conf.json");

describe("check-version.mjs — file content shape", () => {
  const src = readFileSync(scriptPath, "utf-8");

  it("is an ESM module that imports from node:fs, node:path, node:url", () => {
    expect(src).toMatch(/from\s+['"]node:fs['"]/);
    expect(src).toMatch(/from\s+['"]node:path['"]/);
    expect(src).toMatch(/from\s+['"]node:url['"]/);
  });

  it("reads package.json via readFileSync", () => {
    expect(src).toMatch(/readFileSync/);
    expect(src).toMatch(/package\.json/);
  });

  it("reads tauri.conf.json via readFileSync", () => {
    expect(src).toMatch(/tauri\.conf\.json/);
  });

  it("calls process.exit(0) on match", () => {
    expect(src).toMatch(/process\.exit\s*\(\s*0\s*\)/);
  });

  it("calls process.exit(1) on mismatch", () => {
    expect(src).toMatch(/process\.exit\s*\(\s*1\s*\)/);
  });

  it("mismatch error message contains 'package.json=' and 'tauri.conf.json='", () => {
    expect(src).toMatch(/package\.json=/);
    expect(src).toMatch(/tauri\.conf\.json=/);
  });
});

describe("check-version.mjs — runtime behavior (current repo state)", () => {
  it("exits 0 when package.json and tauri.conf.json versions match", () => {
    const result = spawnSync("node", [scriptPath], { encoding: "utf-8" });
    expect(result.status).toBe(0);
  });

  it("stdout contains the matching version string when versions match", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const result = spawnSync("node", [scriptPath], { encoding: "utf-8" });
    // Only check stdout content when exit is 0
    if (result.status === 0) {
      expect(result.stdout).toMatch(pkg.version);
    }
  });
});

describe("check-version.mjs — mismatch behavior", () => {
  it("exits 1 and writes to stderr when versions differ", () => {
    // Read current tauri.conf.json, temporarily patch its version
    const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
    const originalVersion = tauriConf.version;
    const patchedVersion = "0.0.0-test-mismatch";

    // Patch tauri.conf.json temporarily
    tauriConf.version = patchedVersion;
    writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2), "utf-8");

    let result: ReturnType<typeof spawnSync>;
    try {
      result = spawnSync("node", [scriptPath], { encoding: "utf-8" });
    } finally {
      // Always restore original version
      tauriConf.version = originalVersion;
      writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2), "utf-8");
    }

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/package\.json=/i);
    expect(result.stderr).toMatch(/tauri\.conf\.json=/i);
  });
});
