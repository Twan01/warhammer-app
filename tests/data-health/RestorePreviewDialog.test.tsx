/**
 * Phase 81 (RST-01 through RST-05, RST-09) -- Restore Preview Dialog tests.
 *
 * Tests the full restore flow: file picker, validation invoke, preview dialog
 * with schema compatibility states, and confirmation gate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BackupManifest } from "@/types/backup";

const mockOpen = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/hooks/useDiagnostics", () => ({
  useBackupStatus: () => null,
  BACKUP_STORAGE_KEY: "lastBackup",
}));

import { BackupCard } from "@/features/data-health/BackupCard";
import { toast } from "sonner";

const MOCK_MANIFEST: BackupManifest = {
  app_version: "0.2.14",
  schema_version: 32,
  created_at: new Date().toISOString(),
  platform: "windows",
  db_size_bytes: 2516582,
};

function mockValidationSuccess(
  manifest: BackupManifest = MOCK_MANIFEST,
  currentSchemaVersion: number = 32,
) {
  mockOpen.mockResolvedValueOnce("C:\\backups\\test.zip");
  mockInvoke.mockImplementation((cmd: string) => {
    if (cmd === "validate_backup") return Promise.resolve(manifest);
    if (cmd === "get_schema_version") return Promise.resolve(currentSchemaVersion);
    return Promise.reject(new Error(`Unknown command: ${cmd}`));
  });
}

beforeEach(() => {
  mockOpen.mockReset();
  mockInvoke.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.info).mockReset();
  localStorage.clear();
});

describe("Restore flow", () => {
  it("renders Restore from Backup button", () => {
    render(<BackupCard />);
    expect(
      screen.getByRole("button", { name: /restore from backup/i }),
    ).toBeInTheDocument();
  });

  it("opens file picker filtered to .zip when restore button clicked", async () => {
    mockOpen.mockResolvedValueOnce(null);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ extensions: ["zip"] }),
        ]),
      }),
    );
  });

  it("does nothing when file picker is cancelled", async () => {
    mockOpen.mockResolvedValueOnce(null);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("calls validate_backup with selected path", async () => {
    mockValidationSuccess();
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("validate_backup", {
        path: "C:\\backups\\test.zip",
      });
    });
  });

  it("shows error toast when validation fails", async () => {
    mockOpen.mockResolvedValueOnce("C:\\backups\\corrupt.zip");
    mockInvoke.mockRejectedValueOnce(new Error("corrupt zip"));
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid backup file"),
      );
    });
  });

  it("shows preview dialog after successful validation", async () => {
    mockValidationSuccess();
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Restore Backup")).toBeInTheDocument();
    });
  });

  it("displays all manifest fields in preview", async () => {
    mockValidationSuccess();
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Restore Backup")).toBeInTheDocument();
    });

    expect(screen.getByText("App Version")).toBeInTheDocument();
    expect(screen.getByText("Schema Version")).toBeInTheDocument();
    expect(screen.getByText("Database Size")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("disables action button when schema is newer", async () => {
    mockValidationSuccess({ ...MOCK_MANIFEST, schema_version: 99 }, 32);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Restore Backup")).toBeInTheDocument();
    });

    const actionButton = screen.getByRole("button", {
      name: /replace current database/i,
    });
    expect(actionButton).toBeDisabled();
  });

  it("shows error banner when schema is newer", async () => {
    mockValidationSuccess({ ...MOCK_MANIFEST, schema_version: 99 }, 32);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Update the app before restoring/),
      ).toBeInTheDocument();
    });
  });

  it("shows warning banner when schema is older", async () => {
    mockValidationSuccess({ ...MOCK_MANIFEST, schema_version: 20 }, 32);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Some data may need migration after restore/),
      ).toBeInTheDocument();
    });

    const actionButton = screen.getByRole("button", {
      name: /replace current database/i,
    });
    expect(actionButton).not.toBeDisabled();
  });

  it("shows no banner when schema matches", async () => {
    mockValidationSuccess({ ...MOCK_MANIFEST, schema_version: 32 }, 32);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Restore Backup")).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/Update the app before restoring/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Some data may need migration/),
    ).not.toBeInTheDocument();
  });

  it("shows placeholder toast on confirm click", async () => {
    mockValidationSuccess({ ...MOCK_MANIFEST, schema_version: 32 }, 32);
    render(<BackupCard />);

    await userEvent.click(
      screen.getByRole("button", { name: /restore from backup/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Restore Backup")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /replace current database/i }),
    );

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        "Restore execution coming in a future update",
      );
    });
  });
});
