/**
 * Phase 78 — getRecentForgottenRules query behavioral tests (Task 78-01-02, Req DB-02).
 *
 * Verifies:
 * - Normal: parses JSON arrays and returns deduplicated string[]
 * - Deduplication: same rule appearing in multiple logs collapses to one entry
 * - Empty results: returns [] when no battle logs match
 * - Malformed JSON: try/catch returns [] without throwing
 * - Non-array JSON: gracefully skipped
 */
import { describe, it, vi, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { getRecentForgottenRules } from "@/db/queries/battleLogs";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("getRecentForgottenRules — SQL contract", () => {
  it("queries battle_logs filtered by army_list_id with ORDER BY and LIMIT 3", async () => {
    selectMock.mockResolvedValue([]);
    await getRecentForgottenRules(42);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toMatch(/FROM battle_logs/);
    expect(sql).toMatch(/army_list_id\s*=\s*\$1/);
    expect(sql).toMatch(/forgotten_rules IS NOT NULL/);
    expect(sql).toMatch(/LIMIT 3/);
    expect(params).toEqual([42]);
  });
});

describe("getRecentForgottenRules — normal JSON parsing", () => {
  it("returns deduplicated rules from a single battle log row", async () => {
    selectMock.mockResolvedValue([
      { forgotten_rules: JSON.stringify(["Advance and shoot penalty", "CP regen rule"]) },
    ]);
    const result = await getRecentForgottenRules(1);
    expect(result).toHaveLength(2);
    expect(result).toContain("Advance and shoot penalty");
    expect(result).toContain("CP regen rule");
  });

  it("deduplicates rules that appear in multiple battle logs", async () => {
    selectMock.mockResolvedValue([
      { forgotten_rules: JSON.stringify(["Advance and shoot penalty", "CP regen rule"]) },
      { forgotten_rules: JSON.stringify(["CP regen rule", "Sticky objectives"]) },
      { forgotten_rules: JSON.stringify(["Advance and shoot penalty"]) },
    ]);
    const result = await getRecentForgottenRules(1);
    // "Advance and shoot penalty" appears in logs 1 and 3 — dedup to 1
    // "CP regen rule" appears in logs 1 and 2 — dedup to 1
    // "Sticky objectives" appears once
    expect(result).toHaveLength(3);
    const seen = new Set(result);
    expect(seen.size).toBe(3);
    expect(seen.has("Advance and shoot penalty")).toBe(true);
    expect(seen.has("CP regen rule")).toBe(true);
    expect(seen.has("Sticky objectives")).toBe(true);
  });
});

describe("getRecentForgottenRules — empty results", () => {
  it("returns [] when no battle logs match the army_list_id", async () => {
    selectMock.mockResolvedValue([]);
    const result = await getRecentForgottenRules(999);
    expect(result).toEqual([]);
  });
});

describe("getRecentForgottenRules — malformed JSON (T-78-01 threat mitigation)", () => {
  it("returns [] and does not throw when forgotten_rules is malformed JSON", async () => {
    selectMock.mockResolvedValue([
      { forgotten_rules: "this is not valid JSON {{{{" },
    ]);
    await expect(getRecentForgottenRules(1)).resolves.toEqual([]);
  });

  it("skips malformed rows and returns rules from valid rows", async () => {
    selectMock.mockResolvedValue([
      { forgotten_rules: "not-json" },
      { forgotten_rules: JSON.stringify(["Valid rule"]) },
    ]);
    const result = await getRecentForgottenRules(1);
    expect(result).toEqual(["Valid rule"]);
  });

  it("returns [] when forgotten_rules is a JSON non-array (string, number, object)", async () => {
    selectMock.mockResolvedValue([
      { forgotten_rules: JSON.stringify("just a string") },
      { forgotten_rules: JSON.stringify(42) },
      { forgotten_rules: JSON.stringify({ key: "value" }) },
    ]);
    const result = await getRecentForgottenRules(1);
    expect(result).toEqual([]);
  });

  it("filters out empty-string entries from parsed arrays", async () => {
    selectMock.mockResolvedValue([
      { forgotten_rules: JSON.stringify(["", "Valid rule", ""]) },
    ]);
    const result = await getRecentForgottenRules(1);
    expect(result).toEqual(["Valid rule"]);
  });
});
