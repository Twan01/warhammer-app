// Wave 0 stubs — Phase 21 (WISH-01..04) Component integration tests

// TODO Wave 2: import { render, screen } from "@testing-library/react";
// TODO Wave 2: import { WishlistPage } from "@/features/wishlist/WishlistPage";
// TODO Wave 2: import { vi } from "vitest";

/**
 * Pitfall 6: shadcn Select renders selected value in both visible span AND hidden
 * native option — use getAllByText or scope queries to specific container role.
 */

import { describe, it } from "vitest";

describe("WishlistPage — WISH-01 (add item)", () => {
  it.skip("renders Sheet form with name, faction, cost, notes fields on Add click", () => {});
  it.skip("submits form and new item appears in list", () => {});
});

describe("WishlistPage — WISH-02 (view items)", () => {
  it.skip("renders rows with name, faction name, estimated cost, notes, date", () => {});
  it.skip("shows empty state when no items exist", () => {});
  it.skip("shows total estimated cost summary bar when items exist", () => {});
});

describe("WishlistPage — WISH-03 (delete item)", () => {
  it.skip("opens delete dialog on Delete button click", () => {});
  it.skip("removes item from list after confirm", () => {});
});

describe("WishlistPage — WISH-04 (notes)", () => {
  it.skip("displays notes text (truncated) on row for items with notes", () => {});
});
