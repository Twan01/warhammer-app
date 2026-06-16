/**
 * ERR-03 -- DbHealthGate blocks app until DB health check passes.
 *
 * Mocks getDb to control SELECT 1 and PRAGMA user_version results.
 * Verifies: pass renders children, getDb failure shows diagnostic,
 * version mismatch shows diagnostic, retry re-runs the check.
 *
 * REL-08 / D-09: boot-failure path calls logFrontend with a [boot-failure] line.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSelect = vi.fn();
const mockGetDb = vi.fn();
const mockLogFrontend = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

vi.mock("@/lib/frontendLog", () => ({
  logFrontend: (...a: unknown[]) => mockLogFrontend(...a),
}));

import { DbHealthGate, EXPECTED_SCHEMA_VERSION } from "@/components/common/DbHealthGate";

beforeEach(() => {
  mockSelect.mockReset();
  mockGetDb.mockReset();
  mockLogFrontend.mockReset();
});

function setupHealthyDb(version = EXPECTED_SCHEMA_VERSION) {
  mockSelect.mockImplementation((sql: string) => {
    if (sql === "SELECT 1") return Promise.resolve([{ "1": 1 }]);
    // Schema version now comes from the migrator ledger, not PRAGMA user_version.
    if (sql.includes("_sqlx_migrations"))
      return Promise.resolve([{ version }]);
    if (sql === "PRAGMA user_version")
      return Promise.resolve([{ user_version: version }]);
    return Promise.resolve([]);
  });
  mockGetDb.mockResolvedValue({ select: mockSelect });
}

describe("DbHealthGate — ERR-03", () => {
  it("renders children when health check passes", async () => {
    setupHealthyDb();
    render(
      <DbHealthGate>
        <span data-testid="child">App Content</span>
      </DbHealthGate>
    );
    expect(await screen.findByTestId("child")).toBeDefined();
  });

  it("renders DbDiagnosticScreen when getDb throws", async () => {
    mockGetDb.mockRejectedValue(new Error("Connection failed"));
    render(
      <DbHealthGate>
        <span data-testid="child">App Content</span>
      </DbHealthGate>
    );
    expect(await screen.findByText(/Connection failed/)).toBeDefined();
    expect(screen.queryByTestId("child")).toBeNull();
  });

  it("renders DbDiagnosticScreen when schema version < expected", async () => {
    setupHealthyDb(20);
    render(
      <DbHealthGate>
        <span data-testid="child">App Content</span>
      </DbHealthGate>
    );
    expect(await screen.findByText(/Schema version mismatch/)).toBeDefined();
    expect(screen.queryByTestId("child")).toBeNull();
  });

  it("Retry button re-runs health check and renders app on success", async () => {
    const user = userEvent.setup();

    // First call fails
    mockGetDb.mockRejectedValueOnce(new Error("Connection failed"));

    render(
      <DbHealthGate>
        <span data-testid="child">App Content</span>
      </DbHealthGate>
    );

    // Wait for diagnostic screen
    expect(await screen.findByText(/Connection failed/)).toBeDefined();

    // Now set up healthy DB for retry
    setupHealthyDb();

    // Click retry
    await user.click(screen.getByRole("button", { name: /retry/i }));

    // Child should appear
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeDefined();
    });
  });

  it("EXPECTED_SCHEMA_VERSION matches migration count", () => {
    expect(EXPECTED_SCHEMA_VERSION).toBe(47);
  });

  // REL-08 / D-09: boot-failure path writes to frontend.log via logFrontend.
  it("calls logFrontend with a [boot-failure] line when getDb throws", async () => {
    mockGetDb.mockRejectedValue(new Error("DB boot error"));

    render(
      <DbHealthGate>
        <span data-testid="child">App Content</span>
      </DbHealthGate>
    );

    // Wait for the diagnostic screen to appear (confirms the catch branch ran).
    await screen.findByText(/DB boot error/);

    // logFrontend must have been called with a [boot-failure] line.
    await waitFor(() => {
      expect(mockLogFrontend).toHaveBeenCalled();
    });
    const logLine: string = mockLogFrontend.mock.calls[0][0];
    expect(logLine).toContain("[boot-failure]");
    expect(logLine).toContain("DbHealthGate");
    expect(logLine).toContain("DB boot error");
  });
});
