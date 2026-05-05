// Wave 0 stubs — Phase 21 (WISH-01..04) SQL contract tests

// TODO Wave 1: import { getWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem } from "@/db/queries/wishlistItems";
// TODO Wave 1: import type { WishlistItem, CreateWishlistItemInput, UpdateWishlistItemInput } from "@/types/wishlistItem";

import { describe, it } from "vitest";

describe("getWishlistItems", () => {
  it.skip("returns all items ordered by created_at DESC", () => {});
  it.skip("returns empty array when no items exist", () => {});
});

describe("createWishlistItem", () => {
  it.skip("inserts name, faction_id, estimated_cost_pence, notes and returns lastInsertId", () => {});
  it.skip("stores null for estimated_cost_pence when not provided", () => {});
  it.skip("stores null for notes when not provided", () => {});
});

describe("updateWishlistItem", () => {
  it.skip("updates all fields using full-replacement UPDATE (no COALESCE)", () => {});
  it.skip("can clear estimated_cost_pence and notes to null", () => {});
});

describe("deleteWishlistItem", () => {
  it.skip("deletes item by id", () => {});
});
