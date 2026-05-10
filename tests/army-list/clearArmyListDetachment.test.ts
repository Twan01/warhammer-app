/**
 * Phase 52 — clearArmyListDetachment query function tests.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Verifies SQL uses SET detachment_id = NULL, detachment_name = NULL WHERE id=$1.
 * Separate from updateArmyList because COALESCE blocks NULL passthrough.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: vi.fn(), execute: executeMock }),
}));

import { clearArmyListDetachment } from "@/db/queries/armyLists";

beforeEach(() => {
  executeMock.mockReset();
});

describe("clearArmyListDetachment query", () => {
  it("issues UPDATE with SET detachment_id = NULL and detachment_name = NULL WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await clearArmyListDetachment(42);

    expect(executeMock).toHaveBeenCalledOnce();
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/SET\s+detachment_id\s*=\s*NULL/);
    expect(sql).toMatch(/detachment_name\s*=\s*NULL/);
    expect(sql).toMatch(/WHERE id = \$1/);
    expect(params).toEqual([42]);
  });

  it("does NOT use COALESCE — allows explicit NULL passthrough for detachment clearing", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await clearArmyListDetachment(7);

    const [sql] = executeMock.mock.calls[0];
    expect(sql).not.toMatch(/COALESCE/i);
  });

  it("updates updated_at to datetime('now') alongside the NULL assignments", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await clearArmyListDetachment(99);

    const [sql] = executeMock.mock.calls[0];
    expect(sql).toMatch(/updated_at\s*=\s*datetime\('now'\)/);
  });
});
