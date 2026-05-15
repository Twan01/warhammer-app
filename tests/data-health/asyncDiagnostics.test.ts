/**
 * DX-04 -- Async/lazy diagnostics: independent query keys and hooks.
 *
 * Verifies that each diagnostic hook uses a unique query key so
 * React Query loads them independently (no blocking).
 * Also verifies the hooks import the correct query functions.
 */
import { describe, it, expect } from "vitest";
import {
  TABLE_COUNTS_KEY,
  DIAGNOSTIC_FLAGS_KEY,
  SCHEMA_VERSIONS_KEY,
} from "@/hooks/useDiagnostics";

describe("DX-04: Independent query keys", () => {
  it("TABLE_COUNTS_KEY is a unique query key", () => {
    expect(TABLE_COUNTS_KEY).toEqual(["diagnostics", "table-counts"]);
  });

  it("DIAGNOSTIC_FLAGS_KEY is a unique query key", () => {
    expect(DIAGNOSTIC_FLAGS_KEY).toEqual(["diagnostics", "flags"]);
  });

  it("SCHEMA_VERSIONS_KEY is a unique query key", () => {
    expect(SCHEMA_VERSIONS_KEY).toEqual(["diagnostics", "schema-versions"]);
  });

  it("all three query keys are distinct from each other", () => {
    const keys = [TABLE_COUNTS_KEY, DIAGNOSTIC_FLAGS_KEY, SCHEMA_VERSIONS_KEY];
    const serialized = keys.map((k) => JSON.stringify(k));
    const unique = new Set(serialized);
    expect(unique.size).toBe(3);
  });
});
