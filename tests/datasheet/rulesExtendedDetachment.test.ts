/**
 * Phase 52 — getDetachmentById and getStratagemsByDetachment query function tests.
 *
 * Mocks @/db/rules-client because both functions read from rules.db only.
 * Extends the Phase 43 rulesExtendedQueries.test.ts pattern.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const rulesSelectMock = vi.fn();

vi.mock("@/db/rules-client", () => ({
  getRulesDb: async () => ({ select: rulesSelectMock }),
}));

import {
  getDetachmentById,
  getStratagemsByDetachment,
} from "@/db/queries/rulesExtended";

beforeEach(() => {
  rulesSelectMock.mockReset();
});

describe("getDetachmentById query", () => {
  it("issues SELECT * FROM rw_detachments WHERE id = $1 and returns the first row", async () => {
    const sample = [
      { id: "det-gladius", faction_id: "SM", name: "Gladius Task Force", legend: null, type: null },
    ];
    rulesSelectMock.mockResolvedValueOnce(sample);

    const result = await getDetachmentById("det-gladius");

    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT * FROM rw_detachments WHERE id = $1",
      ["det-gladius"]
    );
    expect(result).toEqual(sample[0]);
  });

  it("returns null when no row matches the given detachment id", async () => {
    rulesSelectMock.mockResolvedValueOnce([]);

    const result = await getDetachmentById("nonexistent-id");

    expect(result).toBeNull();
  });
});

describe("getStratagemsByDetachment query", () => {
  it("issues SELECT * FROM rw_stratagems WHERE detachment_id = $1 ORDER BY name and returns all rows", async () => {
    const sample = [
      {
        id: "strat1",
        faction_id: "SM",
        name: "Armour of Contempt",
        type: "Battle Tactic",
        cp_cost: "1",
        legend: null,
        turn: "Either",
        phase: "Any",
        detachment: "Gladius Task Force",
        detachment_id: "det-gladius",
        description: "Reduce wound rolls against this unit by 1.",
      },
    ];
    rulesSelectMock.mockResolvedValueOnce(sample);

    const result = await getStratagemsByDetachment("det-gladius");

    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT * FROM rw_stratagems WHERE detachment_id = $1 ORDER BY name",
      ["det-gladius"]
    );
    expect(result).toEqual(sample);
  });

  it("returns an empty array when no stratagems exist for the given detachment", async () => {
    rulesSelectMock.mockResolvedValueOnce([]);

    const result = await getStratagemsByDetachment("det-empty");

    expect(result).toEqual([]);
  });
});
