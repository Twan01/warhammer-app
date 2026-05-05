// Phase 21 — Wishlist query module SQL contract tests (WISH-01..04).
//
// Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
// Mirrors tests/battle-log/battleLogQueries.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem } from "@/db/queries/wishlistItems";
import type { CreateWishlistItemInput, UpdateWishlistItemInput } from "@/types/wishlistItem";

const dbSelectMock = vi.fn();
const dbExecuteMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: dbSelectMock, execute: dbExecuteMock })),
}));

beforeEach(() => {
  dbSelectMock.mockReset();
  dbExecuteMock.mockReset();
});

describe("getWishlistItems", () => {
  it("returns all items ordered by created_at DESC", async () => {
    const mockData = [{ id: 1, name: "Helbrute", faction_id: 1, estimated_cost_pence: 4500, notes: null, created_at: "2026-01-01" }];
    dbSelectMock.mockResolvedValue(mockData);
    const result = await getWishlistItems();
    expect(dbSelectMock.mock.calls[0][0]).toContain("ORDER BY created_at DESC");
    expect(result).toEqual(mockData);
  });

  it("returns empty array when no items exist", async () => {
    dbSelectMock.mockResolvedValue([]);
    const result = await getWishlistItems();
    expect(result).toEqual([]);
  });
});

describe("createWishlistItem", () => {
  it("inserts name, faction_id, estimated_cost_pence, notes and returns lastInsertId", async () => {
    dbExecuteMock.mockResolvedValue({ lastInsertId: 42, rowsAffected: 1 });
    const input: CreateWishlistItemInput = { name: "Helbrute", faction_id: 1, estimated_cost_pence: 4500, notes: "Birthday gift" };
    const id = await createWishlistItem(input);
    const [sql, params] = dbExecuteMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO wishlist_items");
    expect(params).toEqual(["Helbrute", 1, 4500, "Birthday gift"]);
    expect(id).toBe(42);
  });

  it("stores null for estimated_cost_pence when not provided", async () => {
    dbExecuteMock.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
    const input: CreateWishlistItemInput = { name: "Helbrute", faction_id: 1, estimated_cost_pence: null, notes: "Some note" };
    await createWishlistItem(input);
    const [, params] = dbExecuteMock.mock.calls[0];
    expect(params[2]).toBeNull();
  });

  it("stores null for notes when not provided", async () => {
    dbExecuteMock.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
    const input: CreateWishlistItemInput = { name: "Helbrute", faction_id: 1, estimated_cost_pence: 3000, notes: null };
    await createWishlistItem(input);
    const [, params] = dbExecuteMock.mock.calls[0];
    expect(params[3]).toBeNull();
  });
});

describe("updateWishlistItem", () => {
  it("updates all fields using full-replacement UPDATE (no COALESCE)", async () => {
    dbExecuteMock.mockResolvedValue({ rowsAffected: 1 });
    const input: UpdateWishlistItemInput = { id: 1, name: "New Name", faction_id: 2, estimated_cost_pence: 3000, notes: "Updated" };
    await updateWishlistItem(input);
    const [sql] = dbExecuteMock.mock.calls[0];
    expect(sql).toContain("SET name = $1, faction_id = $2, estimated_cost_pence = $3, notes = $4");
    expect(sql).not.toContain("COALESCE");
  });

  it("can clear estimated_cost_pence and notes to null", async () => {
    dbExecuteMock.mockResolvedValue({ rowsAffected: 1 });
    const input: UpdateWishlistItemInput = { id: 1, name: "Some Name", faction_id: 1, estimated_cost_pence: null, notes: null };
    await updateWishlistItem(input);
    const [, params] = dbExecuteMock.mock.calls[0];
    // params order: [name, faction_id, estimated_cost_pence, notes, id]
    expect(params[2]).toBeNull(); // estimated_cost_pence
    expect(params[3]).toBeNull(); // notes
  });
});

describe("deleteWishlistItem", () => {
  it("deletes item by id", async () => {
    dbExecuteMock.mockResolvedValue({ rowsAffected: 1 });
    await deleteWishlistItem(7);
    const [sql, params] = dbExecuteMock.mock.calls[0];
    expect(sql).toContain("DELETE FROM wishlist_items WHERE id = $1");
    expect(params).toEqual([7]);
  });
});
