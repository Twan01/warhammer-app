/**
 * BK-01 -- BackupCard renders button and invokes backup_database on click.
 *
 * Mocks Tauri APIs (save dialog + invoke) and verifies:
 *   - "Create Backup" button is rendered
 *   - Clicking it opens save dialog
 *   - On dialog confirm, invoke("backup_database") is called
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSave = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useBackupStatus to return null (no prior backup)
vi.mock("@/hooks/useDiagnostics", () => ({
  useBackupStatus: () => null,
  BACKUP_STORAGE_KEY: "lastBackup",
}));

import { BackupCard } from "@/features/data-health/BackupCard";
import { toast } from "sonner";

beforeEach(() => {
  mockSave.mockReset();
  mockInvoke.mockReset();
  localStorage.clear();
});

describe("BackupCard", () => {
  it("renders the Create Backup button", () => {
    render(<BackupCard />);
    expect(screen.getByRole("button", { name: /create backup/i })).toBeInTheDocument();
  });

  it("shows 'No backups yet' when no prior backup exists", () => {
    render(<BackupCard />);
    expect(screen.getByText("No backups yet")).toBeInTheDocument();
  });

  it("calls save dialog when button is clicked", async () => {
    mockSave.mockResolvedValueOnce(null); // user cancels

    render(<BackupCard />);
    const button = screen.getByRole("button", { name: /create backup/i });
    await userEvent.click(button);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Save Database Backup",
        filters: expect.arrayContaining([
          expect.objectContaining({ extensions: ["db"] }),
        ]),
      })
    );
  });

  it("does not invoke backup_database if dialog is cancelled", async () => {
    mockSave.mockResolvedValueOnce(null);

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("invokes backup_database when dialog returns a path", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.db");
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("backup_database", {
        destination: "C:\\backups\\test.db",
      });
    });
  });

  it("shows success toast after successful backup", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.db");
    mockInvoke.mockResolvedValueOnce(undefined);

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Backup created successfully");
    });
  });

  it("shows error toast when backup fails", async () => {
    mockSave.mockResolvedValueOnce("C:\\backups\\test.db");
    mockInvoke.mockRejectedValueOnce(new Error("disk full"));

    render(<BackupCard />);
    await userEvent.click(screen.getByRole("button", { name: /create backup/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Backup failed: disk full");
    });
  });
});
