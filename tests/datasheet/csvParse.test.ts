/**
 * Phase 15 — parseWahapediaCsv pure function tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-02 will:
 *   1. Create src/lib/parseWahapediaCsv.ts exporting parseWahapediaCsv(raw: string).
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 15-VALIDATION.md row 15-01-01.
 *
 * The stub exists in Wave 0 so Plan 15-02 has a concrete failing-or-skipped vitest target.
 *
 * Pipe-delimited CSV format details from 15-RESEARCH.md §Pattern 3:
 *   - first line is headers split by "|"
 *   - each subsequent line maps to an object keyed by header
 *   - Wahapedia CSVs have a trailing "|" on each row (last empty column tolerated)
 *   - empty body returns []
 */
import { describe, it } from "vitest";

describe("parseWahapediaCsv — Wave 0 stubs", () => {
  it.skip("DS-01: parses simple pipe-delimited CSV with 3 columns and 2 rows", () => {
    // Plan 15-02 will:
    //   - import { parseWahapediaCsv } from "@/lib/parseWahapediaCsv"
    //   - const raw = "id|name|role\n001|Intercessors|Battleline\n002|Terminators|Elite"
    //   - const rows = parseWahapediaCsv(raw)
    //   - assert rows.length === 2
    //   - assert rows[0] equals { id: "001", name: "Intercessors", role: "Battleline" }
    //   - assert rows[1] equals { id: "002", name: "Terminators", role: "Elite" }
  });

  it.skip("DS-01: handles Wahapedia trailing-pipe rows (header and rows both end with |)", () => {
    // Plan 15-02 will:
    //   - const raw = "id|name|\n001|Intercessors|\n002|Terminators|"
    //   - const rows = parseWahapediaCsv(raw)
    //   - assert rows.length === 2
    //   - assert rows[0].id === "001" && rows[0].name === "Intercessors"
    //   - the trailing empty header maps to "" — values["" key] are tolerated
  });

  it.skip("DS-01: returns [] when the input is empty or contains only the header line", () => {
    // Plan 15-02 will:
    //   - assert parseWahapediaCsv("") deep-equals []
    //   - assert parseWahapediaCsv("id|name|role") deep-equals []  // single line = no data rows
  });
});
