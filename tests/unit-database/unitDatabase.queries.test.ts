import { describe, it, vi } from "vitest";

vi.mock("@/db/client");

describe("searchUdbUnits", () => {
  it.todo("returns empty array for query shorter than 2 chars");
  it.todo("strips FTS5 special characters");
  it.todo("appends * for prefix matching");
  it.todo("calls db.select with MATCH");
});

describe("getUdbFactions", () => {
  it.todo("returns all factions ordered by name");
});

describe("getUdbUnitsByFaction", () => {
  it.todo("returns units for a given faction ID");
});
