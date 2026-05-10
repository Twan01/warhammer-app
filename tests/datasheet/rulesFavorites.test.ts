/**
 * Phase 52 — rulesFavorites query module tests.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Verifies SQL strings and parameter arrays for all four CRUD functions.
 * Key contract: upsertRulesFavorite uses INSERT OR REPLACE with COALESCE subquery
 * to preserve created_at on update.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getRulesFavorites,
  getRulesFavoritesByType,
  upsertRulesFavorite,
  deleteRulesFavorite,
} from "@/db/queries/rulesFavorites";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("getRulesFavorites query", () => {
  it("issues SELECT * FROM rules_favorites ORDER BY rule_name ASC and returns all rows", async () => {
    const sample = [
      {
        id: 1,
        rule_id: "strat-aoc",
        rule_type: "stratagem",
        rule_name: "Armour of Contempt",
        is_reminder: 0,
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
    ];
    selectMock.mockResolvedValueOnce(sample);

    const result = await getRulesFavorites();

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM rules_favorites ORDER BY rule_name ASC"
    );
    expect(result).toEqual(sample);
  });
});

describe("getRulesFavoritesByType query", () => {
  it("issues SELECT * FROM rules_favorites WHERE rule_type = $1 ORDER BY rule_name ASC with the given type", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getRulesFavoritesByType("stratagem");

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM rules_favorites WHERE rule_type = $1 ORDER BY rule_name ASC",
      ["stratagem"]
    );
  });
});

describe("upsertRulesFavorite query", () => {
  it("issues INSERT OR REPLACE INTO rules_favorites with COALESCE subquery to preserve created_at", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await upsertRulesFavorite({
      rule_id: "strat-aoc",
      rule_type: "stratagem",
      rule_name: "Armour of Contempt",
      is_reminder: 0,
    });

    expect(executeMock).toHaveBeenCalledOnce();
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT OR REPLACE INTO rules_favorites/);
    expect(sql).toMatch(/COALESCE\(\(SELECT created_at FROM rules_favorites WHERE rule_id = \$1 AND rule_type = \$2\)/);
    expect(params).toEqual(["strat-aoc", "stratagem", "Armour of Contempt", 0]);
  });

  it("passes is_reminder value correctly as the fourth parameter", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await upsertRulesFavorite({
      rule_id: "da-oath",
      rule_type: "detachment_ability",
      rule_name: "Oath of Moment",
      is_reminder: 1,
    });

    const [, params] = executeMock.mock.calls[0];
    expect(params[3]).toBe(1);
  });
});

describe("deleteRulesFavorite query", () => {
  it("issues DELETE FROM rules_favorites WHERE rule_id = $1 AND rule_type = $2 with both composite key fields", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await deleteRulesFavorite("strat-aoc", "stratagem");

    expect(executeMock).toHaveBeenCalledWith(
      "DELETE FROM rules_favorites WHERE rule_id = $1 AND rule_type = $2",
      ["strat-aoc", "stratagem"]
    );
  });
});
