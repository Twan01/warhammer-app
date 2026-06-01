// @vitest-environment node
/**
 * Gap 1 (DQ-03) + Gap 2 (DQ-04) -- normalizeName and loadAliases behavioral tests.
 *
 * DQ-03: normalizeName handles lowercase, smart quotes, special chars, whitespace.
 * DQ-04: loadAliases returns {} for empty/missing files, loads valid JSON.
 */
import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { normalizeName, loadAliases } from "../../scripts/lib/normalize.ts";

// ── Gap 1: DQ-03 normalizeName ────────────────────────────────────────────────

describe("normalizeName: DQ-03 — name normalization", () => {
  it("lowercases a plain name", () => {
    expect(normalizeName("Intercessors")).toBe("intercessors");
  });

  it("collapses multiple whitespace to a single space", () => {
    expect(normalizeName("Intercessor   Squad")).toBe("intercessor squad");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  Intercessors  ")).toBe("intercessors");
  });

  it("replaces left smart quote (\\u2018) with straight apostrophe", () => {
    // ‘ is the left single quotation mark '
    expect(normalizeName("Emperor‘s Champion")).toBe("emperor's champion");
  });

  it("replaces right smart quote (\\u2019) with straight apostrophe", () => {
    // ’ is the right single quotation mark '
    expect(normalizeName("Emperor’s Champion")).toBe("emperor's champion");
  });

  it("replaces backtick with straight apostrophe", () => {
    expect(normalizeName("Emperor`s Champion")).toBe("emperor's champion");
  });

  it("strips special characters that are not alphanumeric, apostrophe, or space", () => {
    // Dashes, periods, brackets should be stripped
    expect(normalizeName("Mek Gun w/ Smasha gun")).toBe("mek gun w smasha gun");
  });

  it("strips square brackets", () => {
    expect(normalizeName("Scouts [Legends]")).toBe("scouts legends");
  });

  it("handles combined: smart quote replacement + extra whitespace collapse", () => {
    // Smart quote (U+2019, right single quotation mark) gets replaced with straight
    // apostrophe (U+0027), extra spaces get collapsed, output is lowercased.
    const rightSingleQuote = "’";
    const straightApostrophe = "’";
    const input = `T${rightSingleQuote}au Broadside  Battlesuit`;
    const result = normalizeName(input);
    // Result must use straight apostrophe (0x27), spaces collapsed, lowercased
    expect(result.charCodeAt(1)).toBe(0x27); // straight apostrophe not smart quote
    expect(result).toBe(`t${straightApostrophe}au broadside battlesuit`);
  });

  it("returns empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
  });

  it("handles pure whitespace input", () => {
    expect(normalizeName("   ")).toBe("");
  });
});

// ── Gap 2: DQ-04 loadAliases ──────────────────────────────────────────────────

describe("loadAliases: DQ-04 — alias table loading", () => {
  const tmpDir = join(tmpdir(), "hobbyforge-test-" + Date.now());

  it("returns empty object when file does not exist", () => {
    const result = loadAliases("/nonexistent/path/aliases.json");
    expect(result).toEqual({});
  });

  it("returns empty object when file contains an empty JSON object", () => {
    mkdirSync(tmpDir, { recursive: true });
    const emptyFile = join(tmpDir, "empty-aliases.json");
    writeFileSync(emptyFile, "{}");
    const result = loadAliases(emptyFile);
    expect(result).toEqual({});
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads valid JSON alias mapping as Record<string, string>", () => {
    mkdirSync(tmpDir, { recursive: true });
    const aliasFile = join(tmpDir, "aliases.json");
    writeFileSync(aliasFile, JSON.stringify({
      "Biovore": "Biovores",
      "Carnifex": "Carnifexes",
    }));
    const result = loadAliases(aliasFile);
    expect(result).toEqual({
      "Biovore": "Biovores",
      "Carnifex": "Carnifexes",
    });
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty object when file contains malformed JSON", () => {
    mkdirSync(tmpDir, { recursive: true });
    const badFile = join(tmpDir, "bad-aliases.json");
    writeFileSync(badFile, "{ not valid json }");
    const result = loadAliases(badFile);
    expect(result).toEqual({});
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty object when file contains a JSON array (not a plain object)", () => {
    mkdirSync(tmpDir, { recursive: true });
    const arrayFile = join(tmpDir, "array-aliases.json");
    writeFileSync(arrayFile, '["Biovore", "Carnifex"]');
    const result = loadAliases(arrayFile);
    expect(result).toEqual({});
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty object when file contains JSON null", () => {
    mkdirSync(tmpDir, { recursive: true });
    const nullFile = join(tmpDir, "null-aliases.json");
    writeFileSync(nullFile, "null");
    const result = loadAliases(nullFile);
    expect(result).toEqual({});
    rmSync(tmpDir, { recursive: true, force: true });
  });
});
