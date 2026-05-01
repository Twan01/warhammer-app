/**
 * COLL-02..06 — pre-filter logic for the unit table.
 * Wave 1 plan 03-02 fills in test bodies; this file ships the describe/it skeleton
 * so VALIDATION.md sampling commands like
 *   pnpm vitest run tests/collection/unitFilters.test.ts -t "search"
 * resolve to a real test file and exit 0 (skipped tests count as passing in vitest).
 */
describe("unitFilters", () => {
  describe("search", () => {
    it.skip("COLL-02: filters units by name (case-insensitive substring)", () => {});
  });
  describe("faction", () => {
    it.skip("COLL-03: filters units by faction multi-select", () => {});
  });
  describe("status", () => {
    it.skip("COLL-04: filters units by painting status multi-select", () => {});
  });
  describe("category", () => {
    it.skip("COLL-05: filters units by category multi-select", () => {});
  });
  describe("active", () => {
    it.skip("COLL-06: filters units by is_active_project toggle", () => {});
  });
});
