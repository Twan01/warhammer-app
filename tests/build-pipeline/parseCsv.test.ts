// @vitest-environment node
/**
 * Gap 3 (DQ-07) -- parseWahapediaCsv behavioral tests.
 *
 * DQ-07: parseWahapediaCsv parses pipe-delimited CSV into Record array.
 */
import { describe, it, expect } from "vitest";
import { parseWahapediaCsv } from "../../scripts/lib/parseCsv.ts";

describe("parseWahapediaCsv: DQ-07 — Wahapedia pipe-delimited CSV parsing", () => {
  it("parses a minimal two-row CSV into an array of records", () => {
    const raw = `id|name|short_name|
SM|Space Marines|SM|
DG|Death Guard|DG|`;

    const result = parseWahapediaCsv(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "SM", name: "Space Marines", short_name: "SM" });
    expect(result[1]).toEqual({ id: "DG", name: "Death Guard", short_name: "DG" });
  });

  it("maps each row to header keys from the first line", () => {
    const raw = `datasheet_id|name|role|
UNIT-001|Intercessors|Battleline|
UNIT-002|Hellblasters|Devastator|`;

    const result = parseWahapediaCsv(raw);
    expect(result[0]["datasheet_id"]).toBe("UNIT-001");
    expect(result[0]["name"]).toBe("Intercessors");
    expect(result[0]["role"]).toBe("Battleline");
  });

  it("trims whitespace from values", () => {
    const raw = `id|name|
 SM | Space Marines |`;

    const result = parseWahapediaCsv(raw);
    expect(result[0]["id"]).toBe("SM");
    expect(result[0]["name"]).toBe("Space Marines");
  });

  it("returns empty array when input has only a header line (no data rows)", () => {
    const raw = `id|name|role|`;
    const result = parseWahapediaCsv(raw);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for completely empty string", () => {
    const result = parseWahapediaCsv("");
    expect(result).toHaveLength(0);
  });

  it("handles trailing pipe on header and data rows (Wahapedia format)", () => {
    // Wahapedia CSVs have trailing pipe on every line — the last header/value is empty
    // The parser filters empty header tokens, so trailing pipes are ignored
    const raw = `id|name|
SM|Space Marines|
DG|Death Guard|`;

    const result = parseWahapediaCsv(raw);
    // No empty-string key should appear in the records
    expect(Object.keys(result[0])).not.toContain("");
    expect(result).toHaveLength(2);
  });

  it("handles missing values in a row by substituting empty string", () => {
    const raw = `id|name|role|
SM||`;

    const result = parseWahapediaCsv(raw);
    expect(result[0]["name"]).toBe("");
  });

  it("produces one record per non-header data line", () => {
    const lines = ["id|name|"];
    for (let i = 0; i < 10; i++) {
      lines.push(`ID${i}|Unit${i}|`);
    }
    const result = parseWahapediaCsv(lines.join("\n"));
    expect(result).toHaveLength(10);
  });
});
