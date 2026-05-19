/**
 * Phase 82 -- SafetyBackupsList component tests (SAF-04).
 *
 * Verifies populated, empty, and error states for the safety backup listing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import { SafetyBackupsList } from "@/features/data-health/SafetyBackupsList";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("SafetyBackupsList", () => {
  it("renders safety backup entries with timestamps and sizes", async () => {
    const entries = [
      {
        filename: "safety-2026-05-19-1430.zip",
        timestamp: "2026-05-19T14:30:00Z",
        size_bytes: 42000,
      },
    ];
    mockInvoke.mockResolvedValueOnce(entries);

    render(<SafetyBackupsList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(new Date("2026-05-19T14:30:00Z").toLocaleString())
      ).toBeInTheDocument();
    });

    // 42000 bytes -> "41 KB" (42000 / 1024 = 41.015...)
    expect(screen.getByText("41 KB")).toBeInTheDocument();
    expect(mockInvoke).toHaveBeenCalledWith("list_safety_backups");
  });

  it("shows empty state when no safety backups exist", async () => {
    mockInvoke.mockResolvedValueOnce([]);

    render(<SafetyBackupsList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No safety backups yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Safety backups are created automatically/)
    ).toBeInTheDocument();
  });

  it("shows error state when invoke fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("backend error"));

    render(<SafetyBackupsList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/Could not load safety backups/)
      ).toBeInTheDocument();
    });
  });
});
