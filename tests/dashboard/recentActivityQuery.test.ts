/**
 * DASH-06 — getRecentActivity() SQL query function tests.
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Wave 0 stubs (it.skip). Wave 1 flips to `it` after adding getRecentActivity to src/db/queries/dashboard.ts.
 *
 * Pattern source: tests/hobby-journal/paintingSessionQueries.test.ts
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// TODO Wave 1: import { getRecentActivity } from "@/db/queries/dashboard";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("getRecentActivity — SQL shape", () => {
  it.skip("issues two parallel SELECTs (sessions JOIN units, battle_logs)", async () => {
    // selectMock.mockResolvedValueOnce([]); // sessions
    // selectMock.mockResolvedValueOnce([]); // battles
    // await getRecentActivity();
    // expect(selectMock).toHaveBeenCalledTimes(2);
  });

  it.skip("sessions query JOINs painting_sessions to units and selects session_date, id, unit_name, unit_id", async () => {
    // selectMock.mockResolvedValueOnce([]);
    // selectMock.mockResolvedValueOnce([]);
    // await getRecentActivity();
    // const sessionsCall = selectMock.mock.calls.find(([sql]) => /painting_sessions/.test(sql as string));
    // expect(sessionsCall).toBeDefined();
    // const sql = sessionsCall![0] as string;
    // expect(sql).toMatch(/SELECT[\s\S]+ps\.session_date/);
    // expect(sql).toMatch(/u\.name AS unit_name/);
    // expect(sql).toMatch(/JOIN units u ON u\.id = ps\.unit_id/);
    // expect(sql).toMatch(/ORDER BY ps\.session_date DESC, ps\.id DESC/);
    // expect(sql).toMatch(/LIMIT 20/);
  });

  it.skip("battles query selects id, created_at, opponent_faction, result with LIMIT 20", async () => {
    // selectMock.mockResolvedValueOnce([]);
    // selectMock.mockResolvedValueOnce([]);
    // await getRecentActivity();
    // const battlesCall = selectMock.mock.calls.find(([sql]) => /battle_logs/.test(sql as string));
    // expect(battlesCall).toBeDefined();
    // const sql = battlesCall![0] as string;
    // expect(sql).toMatch(/FROM battle_logs/);
    // expect(sql).toMatch(/ORDER BY created_at DESC/);
    // expect(sql).toMatch(/LIMIT 20/);
  });

  it.skip("returns { sessions, battles } object with rows from each query", async () => {
    // selectMock.mockResolvedValueOnce([{ session_date: "2026-05-03", id: 1, unit_name: "X", unit_id: 1 }]);
    // selectMock.mockResolvedValueOnce([{ created_at: "2026-05-02 10:00:00", id: 1, opponent_faction: "Orks", result: "Win" }]);
    // const result = await getRecentActivity();
    // expect(result.sessions).toHaveLength(1);
    // expect(result.battles).toHaveLength(1);
  });

  it.skip("queries run in parallel via Promise.all (timing assertion)", async () => {
    // let sessionsResolved = false;
    // let battlesResolved = false;
    // selectMock
    //   .mockImplementationOnce(() => new Promise((res) => setTimeout(() => { sessionsResolved = true; res([]); }, 10)))
    //   .mockImplementationOnce(() => new Promise((res) => setTimeout(() => { battlesResolved = true; res([]); }, 10)));
    // const start = Date.now();
    // await getRecentActivity();
    // const elapsed = Date.now() - start;
    // expect(elapsed).toBeLessThan(25); // would be 20+ ms if sequential
    // expect(sessionsResolved).toBe(true);
    // expect(battlesResolved).toBe(true);
  });
});
