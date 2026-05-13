/**
 * Phase 15 — parseWahapediaCsv pure function tests.
 *
 * Mirrors the test contract documented in the Wave 0 stub (Plan 15-00 Task 1 §Part A).
 */
import { describe, it, expect } from "vitest";
import { parseWahapediaCsv } from "@/lib/parseWahapediaCsv";

describe("parseWahapediaCsv", () => {
  it("DS-01: parses simple pipe-delimited CSV with 3 columns and 2 rows", () => {
    const raw = "id|name|role\n001|Intercessors|Battleline\n002|Terminators|Elite";
    const rows = parseWahapediaCsv(raw);
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual({ id: "001", name: "Intercessors", role: "Battleline" });
    expect(rows[1]).toEqual({ id: "002", name: "Terminators", role: "Elite" });
  });

  it("DS-01: handles Wahapedia trailing-pipe rows (header and rows both end with |)", () => {
    const raw = "id|name|\n001|Intercessors|\n002|Terminators|";
    const rows = parseWahapediaCsv(raw);
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe("001");
    expect(rows[0].name).toBe("Intercessors");
    expect(rows[1].id).toBe("002");
    expect(rows[1].name).toBe("Terminators");
    // Trailing empty header is filtered out — no ghost "" key.
    expect("" in rows[0]).toBe(false);
  });

  it("DS-01: returns [] when the input is empty or contains only the header line", () => {
    expect(parseWahapediaCsv("")).toEqual([]);
    expect(parseWahapediaCsv("   ")).toEqual([]);
    expect(parseWahapediaCsv("id|name|role")).toEqual([]);
  });
});
