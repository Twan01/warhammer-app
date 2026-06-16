/**
 * REL-07 — UpdateBanner auto-relaunches after install resolves.
 *
 * Tests:
 * 1. When status="installing", relaunch() is called automatically (no click).
 * 2. When relaunch() rejects, toast.error fires with the fallback message AND
 *    the manual "Restart now" button is still rendered (D-05 — no dead end).
 * 3. The installing branch renders an honest transitional message ("restarting").
 * 4. relaunch() is NOT called when status="downloading" (D-06 guard).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockRelaunch = vi.fn();
const mockToastError = vi.fn();

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => mockRelaunch(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...a: unknown[]) => mockToastError(...a),
  },
}));

vi.mock("@/hooks/useAppUpdate", () => ({
  useAppUpdate: () => mockUseAppUpdate(),
}));

const mockUseAppUpdate = vi.fn();

import { UpdateBanner } from "@/components/common/UpdateBanner";

beforeEach(() => {
  vi.clearAllMocks();
  mockRelaunch.mockResolvedValue(undefined);
  mockUseAppUpdate.mockReturnValue({
    status: "idle",
    version: null,
    progress: 0,
    error: null,
    update: null,
    installUpdate: vi.fn(),
    checkForUpdate: vi.fn(),
  });
});

describe("UpdateBanner — REL-07 auto-relaunch", () => {
  it("calls relaunch() automatically when status is installing (no user click)", async () => {
    mockUseAppUpdate.mockReturnValue({
      status: "installing",
      version: "0.5.8",
      progress: 100,
      error: null,
      update: null,
      installUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
    });

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockRelaunch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast.error with fallback message and keeps Restart button when relaunch() rejects", async () => {
    mockRelaunch.mockRejectedValue(new Error("boom"));
    mockUseAppUpdate.mockReturnValue({
      status: "installing",
      version: "0.5.8",
      progress: 100,
      error: null,
      update: null,
      installUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
    });

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Restart failed — please close and reopen the app."
      );
    });

    // Manual fallback button must still be visible (D-05)
    expect(screen.getByRole("button", { name: /restart now/i })).toBeInTheDocument();
  });

  it("renders an honest transitional message in the installing branch", async () => {
    mockUseAppUpdate.mockReturnValue({
      status: "installing",
      version: "0.5.8",
      progress: 100,
      error: null,
      update: null,
      installUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
    });

    render(<UpdateBanner />);

    // The copy should contain "restarting" or "Update installed"
    expect(
      screen.getByText(/restarting|update installed/i)
    ).toBeInTheDocument();
  });

  it("does NOT call relaunch() when status is downloading (D-06 guard)", async () => {
    mockUseAppUpdate.mockReturnValue({
      status: "downloading",
      version: "0.5.8",
      progress: 42,
      error: null,
      update: null,
      installUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
    });

    render(<UpdateBanner />);

    // Give any effect a chance to run
    await new Promise((r) => setTimeout(r, 50));

    expect(mockRelaunch).not.toHaveBeenCalled();
  });
});
