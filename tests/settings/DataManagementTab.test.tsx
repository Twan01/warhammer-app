import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockSave = vi.fn();
const mockOpenDialog = vi.fn();
const mockWriteTextFile = vi.fn();
const mockReadTextFile = vi.fn();
const mockInvoke = vi.fn();
const mockRelaunch = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockGetAppSettings = vi.fn();
const mockUpsertAppSetting = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => mockSave(...args),
  open: (...args: unknown[]) => mockOpenDialog(...args),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => mockRelaunch(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/db/queries/appSettings", () => ({
  getAppSettings: () => mockGetAppSettings(),
  upsertAppSetting: (...args: unknown[]) => mockUpsertAppSetting(...args),
}));

vi.mock("@/hooks/useAppSettings", () => ({
  APP_SETTINGS_KEY: ["app-settings"],
}));

import { DataManagementTab } from "@/features/settings/DataManagementTab";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAppSettings.mockResolvedValue({ theme: "dark", language: "en" });
  mockUpsertAppSetting.mockResolvedValue(undefined);
  mockSave.mockResolvedValue("/tmp/export.json");
  mockWriteTextFile.mockResolvedValue(undefined);
  mockInvoke.mockResolvedValue(undefined);
  mockRelaunch.mockResolvedValue(undefined);
});

describe("DataManagementTab", () => {
  // DAT-01: Data Health
  it("renders Data Health section with Open Data Health button", () => {
    render(<DataManagementTab />);
    expect(screen.getByText("Data Health")).toBeInTheDocument();
    expect(screen.getByText("View diagnostics, backup & restore")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Data Health" })).toBeInTheDocument();
  });

  it("clicking Open Data Health calls navigate", async () => {
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Open Data Health" }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/data-health" });
  });

  // DAT-02: Factory Reset
  it("renders Factory Reset button", () => {
    render(<DataManagementTab />);
    expect(screen.getByRole("button", { name: "Factory Reset" })).toBeInTheDocument();
  });

  it("Factory Reset opens confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Factory Reset" }));
    expect(screen.getByText("Factory Reset — Are you absolutely sure?")).toBeInTheDocument();
  });

  it("Reset App button is disabled until RESET is typed", async () => {
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Factory Reset" }));

    const resetBtn = screen.getByRole("button", { name: "Reset App" });
    expect(resetBtn).toBeDisabled();

    const input = screen.getByPlaceholderText("RESET");
    await user.type(input, "RESET");
    expect(resetBtn).toBeEnabled();
  });

  it("confirming reset calls invoke, clears localStorage, and relaunches", async () => {
    const clearSpy = vi.spyOn(Storage.prototype, "clear");
    const user = userEvent.setup();
    render(<DataManagementTab />);

    await user.click(screen.getByRole("button", { name: "Factory Reset" }));
    await user.type(screen.getByPlaceholderText("RESET"), "RESET");
    await user.click(screen.getByRole("button", { name: "Reset App" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("factory_reset");
    });
    expect(clearSpy).toHaveBeenCalled();
    expect(mockRelaunch).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("reset error shows toast", async () => {
    mockInvoke.mockRejectedValue(new Error("disk full"));
    const user = userEvent.setup();
    render(<DataManagementTab />);

    await user.click(screen.getByRole("button", { name: "Factory Reset" }));
    await user.type(screen.getByPlaceholderText("RESET"), "RESET");
    await user.click(screen.getByRole("button", { name: "Reset App" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("disk full");
    });
  });

  // DAT-03: Export
  it("Export calls save dialog and writeTextFile", async () => {
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Export Preferences" }));

    await waitFor(() => {
      expect(mockGetAppSettings).toHaveBeenCalled();
    });
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: "JSON", extensions: ["json"] }],
      }),
    );
    expect(mockWriteTextFile).toHaveBeenCalledWith(
      "/tmp/export.json",
      expect.stringContaining('"version": 1'),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Preferences exported");
  });

  it("Export cancelled when save returns null", async () => {
    mockSave.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Export Preferences" }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    });
    expect(mockWriteTextFile).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // DAT-04: Import
  it("Import reads file and upserts settings", async () => {
    mockOpenDialog.mockResolvedValue("/tmp/prefs.json");
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({ version: 1, settings: { locale: "fr", currency: "USD" } }),
    );
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Import Preferences" }));

    await waitFor(() => {
      expect(mockUpsertAppSetting).toHaveBeenCalledWith("locale", "fr");
    });
    expect(mockUpsertAppSetting).toHaveBeenCalledWith("currency", "USD");
    expect(mockInvalidateQueries).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith("Imported 2 setting(s)");
  });

  it("Import shows error for malformed JSON", async () => {
    mockOpenDialog.mockResolvedValue("/tmp/bad.json");
    mockReadTextFile.mockResolvedValue("not json {{{");
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Import Preferences" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Could not read file — is it a valid JSON file?",
      );
    });
  });

  it("Import shows error for missing version", async () => {
    mockOpenDialog.mockResolvedValue("/tmp/noversion.json");
    mockReadTextFile.mockResolvedValue(JSON.stringify({ settings: { a: "b" } }));
    const user = userEvent.setup();
    render(<DataManagementTab />);
    await user.click(screen.getByRole("button", { name: "Import Preferences" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Invalid preferences file — missing version or settings",
      );
    });
  });
});
