/**
 * Phase 43 — rulesExtended query module tests.
 *
 * Mocks @/db/rules-client because all four query functions read from rules.db only.
 * Follows the exact pattern from tests/datasheet/datasheetQueries.test.ts.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const rulesSelectMock = vi.fn();

vi.mock("@/db/rules-client", () => ({
  getRulesDb: async () => ({ select: rulesSelectMock }),
}));

// Import AFTER vi.mock so the mocked client is used.
import {
  getStratagemsByFaction,
  getDetachmentsByFaction,
  getDetachmentAbilitiesByDetachment,
  getSharedAbilitiesByFaction,
} from "@/db/queries/rulesExtended";

beforeEach(() => {
  rulesSelectMock.mockReset();
});

describe("rulesExtended queries", () => {
  it("getStratagemsByFaction issues SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name against rules.db and returns the rows", async () => {
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
        detachment: null,
        detachment_id: null,
        description: "Each time a model in that unit would lose a wound.",
      },
    ];
    rulesSelectMock.mockResolvedValueOnce(sample);

    const rows = await getStratagemsByFaction("SM");

    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name",
      ["SM"]
    );
    expect(rows).toEqual(sample);
  });

  it("getDetachmentsByFaction issues SELECT * FROM rw_detachments WHERE faction_id = $1 ORDER BY name against rules.db and returns the rows", async () => {
    const sample = [
      {
        id: "det1",
        faction_id: "SM",
        name: "Gladius Task Force",
        legend: null,
        type: null,
      },
    ];
    rulesSelectMock.mockResolvedValueOnce(sample);

    const rows = await getDetachmentsByFaction("SM");

    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT * FROM rw_detachments WHERE faction_id = $1 ORDER BY name",
      ["SM"]
    );
    expect(rows).toEqual(sample);
  });

  it("getDetachmentAbilitiesByDetachment issues SELECT * FROM rw_detachment_abilities WHERE detachment_id = $1 ORDER BY name against rules.db and returns the rows", async () => {
    const sample = [
      {
        id: "da1",
        faction_id: "SM",
        name: "Adeptus Astartes",
        legend: null,
        description: "Each model in this unit has the Adeptus Astartes ability.",
        detachment: "Gladius Task Force",
        detachment_id: "det1",
      },
    ];
    rulesSelectMock.mockResolvedValueOnce(sample);

    const rows = await getDetachmentAbilitiesByDetachment("det1");

    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT * FROM rw_detachment_abilities WHERE detachment_id = $1 ORDER BY name",
      ["det1"]
    );
    expect(rows).toEqual(sample);
  });

  it("getSharedAbilitiesByFaction issues SELECT * FROM rw_abilities WHERE faction_id = $1 ORDER BY name against rules.db and returns the rows", async () => {
    const sample = [
      {
        id: "ab1",
        name: "Oath of Moment",
        legend: null,
        faction_id: "SM",
        description: "At the start of your Command phase, select one enemy unit.",
      },
    ];
    rulesSelectMock.mockResolvedValueOnce(sample);

    const rows = await getSharedAbilitiesByFaction("SM");

    expect(rulesSelectMock).toHaveBeenCalledWith(
      "SELECT * FROM rw_abilities WHERE faction_id = $1 ORDER BY name",
      ["SM"]
    );
    expect(rows).toEqual(sample);
  });
});
