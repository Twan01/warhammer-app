/**
 * ERR-03 -- DbHealthGate blocks app until DB health check passes.
 *
 * Mocks getDb to control SELECT 1 and PRAGMA user_version results.
 * Verifies: pass renders children, getDb failure shows diagnostic,
 * version mismatch shows diagnostic, retry re-runs the check.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSelect = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

import { DbHealthGate, EXPECTED_SCHEMA_VERSION } from "@/components/common/DbHealthGate";

beforeEach(() => {
  mockSelect.mockReset();
  mockGetDb.mockReset();
});

function setupHealthyDb(version = EXPECTED_SCHEMA_VERSION) {
  mockSelect.mockImplementation((sql: string) => {
    if (sql === "SELECT 1") return Promise.resolve([{ "1": 1 }]);
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

  it("renders DbDiagnosticScreen when user_version < expected", async () => {
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
    expect(EXPECTED_SCHEMA_VERSION).toBe(33);
  });
});
