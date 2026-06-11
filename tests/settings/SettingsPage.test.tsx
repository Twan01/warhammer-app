import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsPage } from "@/app/settings/page";

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
  useUpdateSetting: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function renderWithQC(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAppSettings();
});

describe("SettingsPage", () => {
  it("renders Settings heading", () => {
    renderWithQC(<SettingsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Settings");
  });

  it("renders three tab triggers", () => {
    renderWithQC(<SettingsPage />);
    expect(screen.getByRole("tab", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Data" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "About" })).toBeInTheDocument();
  });

  it("Preferences tab is active by default", () => {
    renderWithQC(<SettingsPage />);
    expect(screen.getByRole("tab", { name: "Preferences", selected: true })).toBeInTheDocument();
  });

  it("shows Skeleton when loading", () => {
    mockUseAppSettings({ isLoading: true });
    renderWithQC(<SettingsPage />);
    // Skeleton renders — no App Preferences heading visible
    expect(screen.queryByText("App Preferences")).not.toBeInTheDocument();
    // Skeleton element is present (renders as a div with animate-pulse)
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("shows error message when query fails", () => {
    mockUseAppSettings({ isError: true });
    renderWithQC(<SettingsPage />);
    expect(screen.getByText(/Could not load settings/)).toBeInTheDocument();
  });
});
