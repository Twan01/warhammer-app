/**
 * Phase 138-01 — TDD RED: compare-store cap-3 and actions.
 *
 * Tests the compareIds Set + addToCompare / removeFromCompare / clearCompare
 * actions directly via getState() / setState() on the Zustand store.
 *
 * These tests are RED until Task 3 adds the compareIds fields to the store.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useDatabaseBrowserFilters } from "@/features/unit-database/databaseBrowserFilters";

// ---------------------------------------------------------------------------
// Reset store state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useDatabaseBrowserFilters.setState({ compareIds: new Set<string>() });
});

// ---------------------------------------------------------------------------
// compareIds — addToCompare
// ---------------------------------------------------------------------------

describe("addToCompare", () => {
  it("adds an id to compareIds", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    expect(useDatabaseBrowserFilters.getState().compareIds.has("unit-a")).toBe(true);
  });

  it("does not add the same id twice (Set semantics)", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(1);
  });

  it("allows up to 3 distinct ids", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().addToCompare("unit-b");
    useDatabaseBrowserFilters.getState().addToCompare("unit-c");
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(3);
  });

  it("enforces hard cap at 3 — 4th distinct add is a no-op (size stays 3)", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().addToCompare("unit-b");
    useDatabaseBrowserFilters.getState().addToCompare("unit-c");
    useDatabaseBrowserFilters.getState().addToCompare("unit-d");
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(3);
    expect(useDatabaseBrowserFilters.getState().compareIds.has("unit-d")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// compareIds — removeFromCompare
// ---------------------------------------------------------------------------

describe("removeFromCompare", () => {
  it("removes an id from compareIds", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().addToCompare("unit-b");
    useDatabaseBrowserFilters.getState().removeFromCompare("unit-a");
    expect(useDatabaseBrowserFilters.getState().compareIds.has("unit-a")).toBe(false);
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(1);
  });

  it("is a no-op for an id not in the set", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().removeFromCompare("unit-nonexistent");
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(1);
  });

  it("allows adding a 4th id after removing one when at cap", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().addToCompare("unit-b");
    useDatabaseBrowserFilters.getState().addToCompare("unit-c");
    useDatabaseBrowserFilters.getState().removeFromCompare("unit-b");
    useDatabaseBrowserFilters.getState().addToCompare("unit-d");
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(3);
    expect(useDatabaseBrowserFilters.getState().compareIds.has("unit-d")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// compareIds — clearCompare
// ---------------------------------------------------------------------------

describe("clearCompare", () => {
  it("empties compareIds", () => {
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().addToCompare("unit-b");
    useDatabaseBrowserFilters.getState().clearCompare();
    expect(useDatabaseBrowserFilters.getState().compareIds.size).toBe(0);
  });

  it("does not affect other filter state", () => {
    useDatabaseBrowserFilters.setState({ searchText: "keep-me" });
    useDatabaseBrowserFilters.getState().addToCompare("unit-a");
    useDatabaseBrowserFilters.getState().clearCompare();
    expect(useDatabaseBrowserFilters.getState().searchText).toBe("keep-me");
  });
});
