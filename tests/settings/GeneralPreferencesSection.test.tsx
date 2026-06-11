import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GeneralPreferencesSection } from "@/features/settings/GeneralPreferencesSection";

const mockMutate = vi.fn();

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
  useUpdateSetting: vi.fn(() => ({ mutate: mockMutate })),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: vi.fn(() => ({
    data: [
      {
        id: 1,
        name: "Adepta Sororitas",
        game_system: "40k",
        description: null,
        color_theme: "#000",
        created_at: "",
        updated_at: "",
      },
      {
        id: 2,
        name: "Space Marines",
        game_system: "40k",
        description: null,
        color_theme: "#00f",
        created_at: "",
        updated_at: "",
      },
    ],
    isLoading: false,
  })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useAppSettings } from "@/hooks/useAppSettings";

function mockSettings(data: Record<string, string> = {}) {
  vi.mocked(useAppSettings).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
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
  mockSettings();
});

describe("GeneralPreferencesSection", () => {
  it('renders "App Preferences" heading', () => {
    renderWithQC(<GeneralPreferencesSection />);
    expect(screen.getByText("App Preferences")).toBeInTheDocument();
  });

  it("renders all 4 setting labels", () => {
    renderWithQC(<GeneralPreferencesSection />);
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Default Faction")).toBeInTheDocument();
    expect(screen.getByText("Readiness Target")).toBeInTheDocument();
  });
});

describe("LanguageSetting", () => {
  it("renders EN and FR buttons", () => {
    renderWithQC(<GeneralPreferencesSection />);
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR" })).toBeInTheDocument();
  });

  it('clicking FR calls mutate with { key: "locale", value: "fr" }', () => {
    renderWithQC(<GeneralPreferencesSection />);
    fireEvent.click(screen.getByRole("button", { name: "FR" }));
    expect(mockMutate).toHaveBeenCalledWith(
      { key: "locale", value: "fr" },
      expect.anything(),
    );
  });

  it("does not call mutate when clicking the already-active locale", () => {
    renderWithQC(<GeneralPreferencesSection />);
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(mockMutate).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: "locale" }),
      expect.anything(),
    );
  });
});

describe("CurrencySetting", () => {
  it("renders select trigger with GBP default", () => {
    renderWithQC(<GeneralPreferencesSection />);
    expect(screen.getByText("GBP (£)")).toBeInTheDocument();
  });
});

describe("DefaultFactionSetting", () => {
  it("renders faction select with None placeholder", () => {
    renderWithQC(<GeneralPreferencesSection />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });
});

describe("ReadinessTargetSetting", () => {
  it("renders 4 preset buttons", () => {
    renderWithQC(<GeneralPreferencesSection />);
    expect(screen.getByRole("button", { name: "500" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1000" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1500" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2000" })).toBeInTheDocument();
  });

  it('clicking 1000 calls mutate with { key: "army_readiness_target", value: "1000" }', () => {
    renderWithQC(<GeneralPreferencesSection />);
    fireEvent.click(screen.getByRole("button", { name: "1000" }));
    expect(mockMutate).toHaveBeenCalledWith(
      { key: "army_readiness_target", value: "1000" },
      expect.anything(),
    );
  });

  it("custom input on blur calls mutate with custom value", async () => {
    const user = userEvent.setup();
    renderWithQC(<GeneralPreferencesSection />);
    const input = screen.getByPlaceholderText("Custom…");

    await user.clear(input);
    await user.type(input, "750");
    await user.tab(); // blur

    expect(mockMutate).toHaveBeenCalledWith(
      { key: "army_readiness_target", value: "750" },
      expect.anything(),
    );
  });
});
