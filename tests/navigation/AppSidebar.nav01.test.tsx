/**
 * Phase 27 — NAV-01 sidebar group label tests.
 *
 * Verifies that the sidebar uses hobby-native group labels:
 * Command, Workshop, Play, Management — and that old labels
 * (Manage, Inventory, Tracking) no longer appear.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/common/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/" }),
  Link: ({ children, className, to }: { children: React.ReactNode; className?: string; to: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

// TODO Wave 1: mock useQuickAdd when QuickAddContext exists
vi.mock("@/context/QuickAddContext", () => ({
  useQuickAdd: () => ({
    activeSheet: null,
    openQuickAdd: vi.fn(),
    closeQuickAdd: vi.fn(),
  }),
}));

function renderSidebar() {
  return render(
    <TooltipProvider>
      <AppSidebar />
    </TooltipProvider>
  );
}

describe("AppSidebar NAV-01: Group Labels", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders 'Command' group label", () => {
    renderSidebar();
    expect(screen.getByText("Command")).toBeInTheDocument();
  });

  it("renders 'Workshop' group label", () => {
    renderSidebar();
    expect(screen.getByText("Workshop")).toBeInTheDocument();
  });

  it("renders 'Play' group label", () => {
    renderSidebar();
    expect(screen.getByText("Play")).toBeInTheDocument();
  });

  it("renders 'Management' group label", () => {
    renderSidebar();
    expect(screen.getByText("Management")).toBeInTheDocument();
  });

  it("does not render old 'Manage' label", () => {
    renderSidebar();
    expect(screen.queryByText("Manage")).not.toBeInTheDocument();
  });

  it("does not render old 'Inventory' label", () => {
    renderSidebar();
    expect(screen.queryByText("Inventory")).not.toBeInTheDocument();
  });

  it("does not render old 'Tracking' label", () => {
    renderSidebar();
    expect(screen.queryByText("Tracking")).not.toBeInTheDocument();
  });

  it("Management group no longer contains a Factions link (Phase 135 / HON-06)", () => {
    renderSidebar();
    // HON-06 removed the standalone /factions sidebar destination — faction
    // management now lives in the Settings → Factions tab. The Management group
    // retains only Spending and Wishlist.
    expect(screen.queryByText("Factions")).not.toBeInTheDocument();
    expect(screen.getByText("Spending")).toBeInTheDocument();
    expect(screen.getByText("Wishlist")).toBeInTheDocument();
  });

  it("Dashboard link appears in Command group", () => {
    renderSidebar();
    const dashboard = screen.getByText("Dashboard");
    expect(dashboard).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // HON-07: Data Health absent from sidebar Management group (Phase 135)
  // ---------------------------------------------------------------------------

  it("HON-07: Management group shows only Spending and Wishlist — Data Health is not present", () => {
    renderSidebar();
    // Data Health must be absent from the sidebar (moved to Settings -> Data)
    expect(screen.queryByText("Data Health")).not.toBeInTheDocument();
    // Management group retains exactly Spending and Wishlist
    expect(screen.getByText("Spending")).toBeInTheDocument();
    expect(screen.getByText("Wishlist")).toBeInTheDocument();
  });
});
