/**
 * Phase 52 — rulesNotes query module tests.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Verifies SQL strings and parameter arrays for getRulesNotes, getRulesNoteByKey,
 * and upsertRulesNote.
 * Key contract: upsertRulesNote uses INSERT OR REPLACE with COALESCE subquery
 * to preserve created_at on update.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getRulesNotes,
  getRulesNoteByKey,
  upsertRulesNote,
} from "@/db/queries/rulesNotes";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("getRulesNotes query", () => {
  it("issues SELECT * FROM rules_notes ORDER BY rule_name ASC and returns all rows", async () => {
    const sample = [
      {
        id: 1,
        rule_id: "strat-aoc",
        rule_type: "stratagem",
        rule_name: "Armour of Contempt",
        note_text: "Use this when targeted by lascannons.",
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
    ];
    selectMock.mockResolvedValueOnce(sample);

    const result = await getRulesNotes();

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM rules_notes ORDER BY rule_name ASC"
    );
    expect(result).toEqual(sample);
  });
});

describe("getRulesNoteByKey query", () => {
  it("issues SELECT * FROM rules_notes WHERE rule_id = $1 AND rule_type = $2 and returns first row", async () => {
    const sample = [
      {
        id: 2,
        rule_id: "da-oath",
        rule_type: "detachment_ability",
        rule_name: "Oath of Moment",
        note_text: "Target the big tank first.",
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
    ];
    selectMock.mockResolvedValueOnce(sample);

    const result = await getRulesNoteByKey("da-oath", "detachment_ability");

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM rules_notes WHERE rule_id = $1 AND rule_type = $2",
      ["da-oath", "detachment_ability"]
    );
    expect(result).toEqual(sample[0]);
  });

  it("returns null when no note matches the composite key", async () => {
    selectMock.mockResolvedValueOnce([]);

    const result = await getRulesNoteByKey("nonexistent", "stratagem");

    expect(result).toBeNull();
  });
});

describe("upsertRulesNote query", () => {
  it("issues INSERT OR REPLACE INTO rules_notes with COALESCE subquery to preserve created_at", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await upsertRulesNote({
      rule_id: "strat-aoc",
      rule_type: "stratagem",
      rule_name: "Armour of Contempt",
      note_text: "Remember to use after saving throws are failed.",
    });

    expect(executeMock).toHaveBeenCalledOnce();
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT OR REPLACE INTO rules_notes/);
    expect(sql).toMatch(/COALESCE\(\(SELECT created_at FROM rules_notes WHERE rule_id = \$1 AND rule_type = \$2\)/);
    expect(params).toEqual([
      "strat-aoc",
      "stratagem",
      "Armour of Contempt",
      "Remember to use after saving throws are failed.",
    ]);
  });

  it("passes note_text as the fourth parameter", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await upsertRulesNote({
      rule_id: "da-oath",
      rule_type: "detachment_ability",
      rule_name: "Oath of Moment",
      note_text: "Great for shooting phases.",
    });

    const [, params] = executeMock.mock.calls[0];
    expect(params[3]).toBe("Great for shooting phases.");
  });
});
