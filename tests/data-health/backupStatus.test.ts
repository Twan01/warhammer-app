/**
 * BK-03 -- Backup status and utility function tests.
 *
 * Tests:
 *   - useBackupStatus reads localStorage correctly
 *   - useBackupStatus returns null when no data
 *   - useBackupStatus handles malformed JSON
 *   - formatRelativeDate formats dates correctly (tested via BackupCard rendering)
 *   - extractFilename extracts filename from paths (tested via BackupCard rendering)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/db/queries/diagnostics", () => ({
  getTableCounts: vi.fn(),
  getDiagnosticFlags: vi.fn(),
  getSchemaVersions: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

import {
  useBackupStatus,
  BACKUP_STORAGE_KEY,
} from "@/hooks/useDiagnostics";

beforeEach(() => {
  localStorage.clear();
});

describe("useBackupStatus", () => {
  it("returns null when no backup data in localStorage", () => {
    const { result } = renderHook(() => useBackupStatus());
    expect(result.current).toBeNull();
  });

  it("reads and parses valid backup data from localStorage", () => {
    const status = {
      date: "2026-05-15T10:00:00.000Z",
      path: "C:\\backups\\hobbyforge-backup-2026-05-15.db",
      success: true,
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));

    const { result } = renderHook(() => useBackupStatus());
    expect(result.current).toEqual(status);
    expect(result.current!.date).toBe("2026-05-15T10:00:00.000Z");
    expect(result.current!.path).toBe("C:\\backups\\hobbyforge-backup-2026-05-15.db");
    expect(result.current!.success).toBe(true);
  });

  it("returns null when localStorage contains malformed JSON", () => {
    localStorage.setItem(BACKUP_STORAGE_KEY, "not valid json{{{");

    const { result } = renderHook(() => useBackupStatus());
    expect(result.current).toBeNull();
  });

  it("reads and parses backup data with app_version from localStorage", () => {
    const status = {
      date: "2026-05-18T10:00:00.000Z",
      path: "C:\\backups\\hobbyforge-backup-2026-05-18.zip",
      success: true,
      app_version: "0.2.14",
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));

    const { result } = renderHook(() => useBackupStatus());
    expect(result.current).not.toBeNull();
    expect(result.current!.app_version).toBe("0.2.14");
  });

  it("handles legacy backup data without app_version field", () => {
    const status = {
      date: "2026-05-15T10:00:00.000Z",
      path: "C:\\backups\\hobbyforge-backup-2026-05-15.db",
      success: true,
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));

    const { result } = renderHook(() => useBackupStatus());
    expect(result.current).not.toBeNull();
    expect(result.current!.app_version).toBeUndefined();
  });

  it("uses BACKUP_STORAGE_KEY constant 'lastBackup'", () => {
    expect(BACKUP_STORAGE_KEY).toBe("lastBackup");
  });
});
