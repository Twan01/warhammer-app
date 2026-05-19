/**
 * Phase 80 + 83 -- BackupCard renders button, invokes export_backup, and shows
 * collapsible diagnostic details (DGN-01/03/04).
 *
 * Mocks Tauri APIs (save dialog + invoke + getVersion) and verifies:
 *   - "Create Backup" button is rendered
 *   - Clicking it opens save dialog with ZIP filter
 *   - On dialog confirm, invoke("export_backup") is called
 *   - Health dot is rendered based on backup status tier
 *   - DGN-04: Diagnostic details are hidden by default
 *   - DGN-04: Diagnostic details appear on expansion
 *   - DGN-01: Never-backed-up state shows call-to-action in expanded details
 *   - DGN-03: Version mismatch shows amber indicator in expanded details
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSave = vi.fn();
const mockInvoke = vi.fn();
const mockGetVersion = vi.fn().mockResolvedValue("0.2.14");

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => mockGetVersion(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Default mock: no prior backup (mutable for per-test override)
const mockUseBackupStatus = vi.fn().mockReturnValue(null);
vi.mock("@/hooks/useDiagnostics", () => ({
  useBackupStatus: () => mockUseBackupStatus(),
  BACKUP_STORAGE_KEY: "lastBackup",
}));

import { BackupCard } from "@/features/data-health/BackupCard";
import { toast } from "sonner";

beforeEach(() => {
  mockSave.mockReset();
  mockInvoke.mockReset();
  mockGetVersion.mockReset().mockResolvedValue("0.2.14");
  mockUseBackupStatus.mockReset().mockReturnValue(null);
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BackupCard", () => {
  it("renders the Create Backup button", () => {
    render(<BackupCard />);
    expect(screen.getByRole("button", { name: /create backup/i })).toBeInTheDocument();
  });

  it("shows 'Never — No backup yet' when no prior backup exists", () => {
    render(<BackupCard />);
    expect(screen.getByText(/Never.*No backup/i)).toBeInTheDocument();
  });

  it("calls save dialog when button is clicked", async () => {
    mockSave.mockResolvedValueOnce(null); // user cancels

    render(<BackupCard />);
    const button = screen.getByRole("button", { name: /create backup/i });
    await userEvent.click(button);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Save Backup",
        filters: expect.arrayContaining([
          expect.objectContaining({ extensions: ["zip"] }),
        ]),
      })
    );
  });

  it("does not invoke export_backup if dialog is cancelled", async () => {
    mockSave.mockResolvedValueOnce(null);

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("invokes export_backup when dialog returns a path", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.zip");
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("export_backup", {
        destination: "C:\\backups\\test.zip",
      });
    });
  });

  it("shows success toast after successful backup", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.zip");
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Backup created successfully");
    });
  });

  it("shows error toast when backup fails", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.zip");
    mockInvoke.mockRejectedValueOnce(new Error("disk full"));

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Backup failed: disk full");
    });
  });

  it("STS-02: renders muted dot when no backup exists", () => {
    render(<BackupCard />);
    const dot = document.querySelector(".bg-muted-foreground");
    expect(dot).toBeInTheDocument();
  });

  it("STS-02: renders green dot for recent backup", () => {
    vi.useFakeTimers();
    const now = new Date("2026-05-18T12:00:00.000Z");
    vi.setSystemTime(now);

    mockUseBackupStatus.mockReturnValue({
      date: now.toISOString(),
      path: "test.zip",
      success: true,
    });

    render(<BackupCard />);
    const greenDot = document.querySelector(".bg-green-500");
    expect(greenDot).toBeInTheDocument();
  });
});

describe("BackupCard — DGN-04: progressive disclosure", () => {
  it("diagnostic details are hidden by default", () => {
    render(<BackupCard />);
    // "Backup age" is inside CollapsibleContent — should not be visible when collapsed
    expect(screen.queryByText("Backup age")).not.toBeInTheDocument();
  });

  it("diagnostic details appear on expansion", async () => {
    render(<BackupCard />);
    const toggle = screen.getByRole("button", { name: /toggle backup details/i });
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText("Backup age")).toBeInTheDocument();
      expect(screen.getByText("App version")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });
});

describe("BackupCard — DGN-01: never-backed-up expanded details", () => {
  it("shows call-to-action text when never backed up", async () => {
    // Default mock returns null (no backup)
    render(<BackupCard />);
    const toggle = screen.getByRole("button", { name: /toggle backup details/i });
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/no backup.*export one/i)).toBeInTheDocument();
    });
  });
});

describe("BackupCard — DGN-03: version mismatch display", () => {
  it("shows amber indicator when backup version differs from current", async () => {
    // Override to return a backup with a different app_version
    mockUseBackupStatus.mockReturnValue({
      date: "2026-05-19T00:00:00Z",
      path: "test.zip",
      success: true,
      app_version: "0.2.13",
    });
    mockGetVersion.mockResolvedValue("0.2.14");

    render(<BackupCard />);

    // Wait for getVersion() to resolve
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /toggle backup details/i })).toBeInTheDocument();
    });

    // Expand details
    const toggle = screen.getByRole("button", { name: /toggle backup details/i });
    await userEvent.click(toggle);

    await waitFor(() => {
      // Both versions should be visible in the version row
      const versionText = screen.getByText(/Backup: v0\.2\.13 \/ Current: v0\.2\.14/);
      expect(versionText).toBeInTheDocument();
      // Amber dot should be present
      const amberDot = document.querySelector(".bg-amber-500");
      expect(amberDot).toBeInTheDocument();
    });
  });
});
