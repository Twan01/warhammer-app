import { describe, it, expect } from "vitest";
import { validateCsvHeaders } from "@/lib/validateCsvHeaders";

describe("validateCsvHeaders", () => {
  it("SYNC-03: passes when all required headers are present", () => {
    const rows = [{ id: "1", name: "Space Marines" }];
    expect(() => validateCsvHeaders("Factions.csv", rows)).not.toThrow();
  });

  it("SYNC-03: throws when a required column is missing", () => {
    const rows = [{ id: "1" }]; // missing "name"
    expect(() => validateCsvHeaders("Factions.csv", rows)).toThrow(
      "Factions.csv: missing required columns: name"
    );
  });

  it("SYNC-03: lists all missing columns when multiple are absent", () => {
    const rows = [{ role: "Battleline" }]; // missing "id", "name", "faction_id"
    expect(() => validateCsvHeaders("Datasheets.csv", rows)).toThrow(
      "Datasheets.csv: missing required columns: id, name, faction_id"
    );
  });

  it("SYNC-03: throws on empty rows array (header-only CSV)", () => {
    expect(() => validateCsvHeaders("Factions.csv", [])).toThrow(
      "Factions.csv: CSV is empty or header-only"
    );
  });

  it("SYNC-03: passes for unknown filenames (e.g. Last_update.csv)", () => {
    expect(() => validateCsvHeaders("Last_update.csv", [{ date: "2024-01-01" }])).not.toThrow();
  });

  it("SYNC-03: validates Datasheets.csv requires id, name, faction_id", () => {
    const rows = [{ id: "1", name: "Intercessors", faction_id: "SM" }];
    expect(() => validateCsvHeaders("Datasheets.csv", rows)).not.toThrow();
  });

  it("SYNC-03: validates Stratagems.csv requires id and name", () => {
    const rows = [{ id: "1", name: "Rapid Ingress" }];
    expect(() => validateCsvHeaders("Stratagems.csv", rows)).not.toThrow();
  });
});
