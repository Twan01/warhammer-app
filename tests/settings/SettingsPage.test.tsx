import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsPage } from "@/app/settings/page";

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(() => Promise.resolve("0.4.14")),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
  }),
}));

import { useAppSettings } from "@/hooks/useAppSettings";

type MockReturn = {
  data?: Record<string, string>;
  isLoading: boolean;
  isError: boolean;
};

function mockUseAppSettings(overrides: Partial<MockReturn> = {}) {
  vi.mocked(useAppSettings).mockReturnValue({
    data: {},
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useAppSettings>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAppSettings();
});

describe("SettingsPage", () => {
  it("renders Settings heading", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Settings");
  });

  it("renders three tab triggers", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("tab", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Data" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "About" })).toBeInTheDocument();
  });

  it("Preferences tab is active by default", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("tab", { name: "Preferences", selected: true })).toBeInTheDocument();
  });

  it("shows Skeleton when loading", () => {
    mockUseAppSettings({ isLoading: true });
    render(<SettingsPage />);
    // Skeleton renders — no Preferences section heading visible
    expect(screen.queryByRole("heading", { level: 2, name: "Preferences" })).not.toBeInTheDocument();
    // Skeleton element is present (renders as a div with animate-pulse)
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("shows error message when query fails", () => {
    mockUseAppSettings({ isError: true });
    render(<SettingsPage />);
    expect(screen.getByText(/Could not load settings/)).toBeInTheDocument();
  });
});
