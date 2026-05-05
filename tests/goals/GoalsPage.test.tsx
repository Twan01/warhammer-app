/**
 * Phase 22 — GoalsPage component stubs.
 *
 * Wave 0: it.skip placeholders naming the exact behavior Plan 22-02 must satisfy.
 * Mocks React Query hooks with vi.mock — no real DB or Tauri bridge needed.
 * Mirrors tests/battle-log/ Page test pattern.
 *
 * Covers ANLY-03 (GoalsPage renders Active / Completed / Missed section groupings and empty state).
 */

// TODO Plan 22-02: import { GoalsPage } from "@/features/goals/GoalsPage"

import { describe, it } from "vitest";

describe("GoalsPage (ANLY-03)", () => {
  it.skip("renders 'Active Goals' section for in-progress goals", () => {});
  it.skip("renders 'Completed' section for goals with progress >= target", () => {});
  it.skip("renders 'Missed' section for expired goals with progress < target", () => {});
  it.skip("renders empty state when no goals exist", () => {});
});
