/**
 * Phase 125-01 -- AboutTab unit tests.
 * Covers ABT-01 (app version), ABT-02 (data stats), ABT-03 (attribution/tech stack).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock Tauri getVersion
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(() => Promise.resolve("0.4.14")),
}));

// Mock udb meta hook
vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(),
}));

import { useUdbMeta } from "@/hooks/useUdbMeta";
import { AboutTab } from "@/features/settings/AboutTab";

const mockUseUdbMeta = vi.mocked(useUdbMeta);

beforeEach(() => {
  mockUseUdbMeta.mockReturnValue({
    data: {
      version: "2026.05.20",
      built_at: "2026-05-20T10:00:00Z",
      game_system: "40k-10th",
      unit_count: 500,
      faction_count: 25,
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useUdbMeta>);
});

describe("AboutTab", () => {
  it("renders HobbyForge heading and app description (ABT-01/D-07)", () => {
    render(<AboutTab />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("HobbyForge");
    expect(screen.getByText("Your personal Warhammer hobby command center.")).toBeInTheDocument();
  });

  it("renders app version after getVersion resolves (ABT-01)", async () => {
    render(<AboutTab />);
    await waitFor(() => {
      expect(screen.getByText(/0\.4\.14/)).toBeInTheDocument();
    });
  });

  it("shows Skeleton while appVersion is null (before getVersion resolves) (ABT-01)", () => {
    render(<AboutTab />);
    // Before the promise resolves, appVersion is null — Skeleton should be present
    // (animate-pulse is the Skeleton's CSS class)
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders unit count and faction count from udbMeta (ABT-02/D-03)", () => {
    render(<AboutTab />);
    expect(screen.getByText(/500 units across 25 factions/)).toBeInTheDocument();
  });

  it("renders formatted data date from udbMeta.built_at (ABT-02/D-03)", () => {
    render(<AboutTab />);
    // The date "2026-05-20T10:00:00Z" — locale-agnostic: look for "2026" in a "Data date:" line
    const dataDateEl = screen.getByText((content) =>
      content.includes("Data date:") && content.includes("2026")
    );
    expect(dataDateEl).toBeInTheDocument();
  });

  it("shows 'Not imported yet' when udbMeta data is null (ABT-02/D-04)", () => {
    mockUseUdbMeta.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useUdbMeta>);

    render(<AboutTab />);
    expect(screen.getByText(/Not imported yet/)).toBeInTheDocument();
  });

  it("shows Skeleton elements when udbMetaLoading is true (ABT-02)", () => {
    mockUseUdbMeta.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUdbMeta>);

    render(<AboutTab />);
    // Stats text not present while loading
    expect(screen.queryByText(/units across/)).not.toBeInTheDocument();
    // Skeleton is rendered
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders Wahapedia attribution text (ABT-03/D-05)", () => {
    render(<AboutTab />);
    expect(screen.getByText(/Wahapedia/)).toBeInTheDocument();
  });

  it("renders tech stack containing Tauri 2, React, TypeScript, and SQLite (ABT-03/D-06)", () => {
    render(<AboutTab />);
    const techText = screen.getByText(/Tauri 2.*React.*TypeScript.*SQLite|Tauri 2, React, TypeScript, SQLite/);
    expect(techText).toBeInTheDocument();
  });
});
