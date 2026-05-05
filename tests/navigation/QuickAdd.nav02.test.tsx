/**
 * Phase 27 — NAV-02 + NAV-03 Quick Add button and dropdown tests.
 *
 * Verifies the Quick Add button renders in both expanded and collapsed states,
 * opens a dropdown with 8 labeled items, and that clicking an item calls
 * openQuickAdd with the correct action identifier.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppSidebar } from "@/components/common/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/" }),
  Link: ({ children, className, to }: { children: React.ReactNode; className?: string; to: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

const mockOpenQuickAdd = vi.fn();

vi.mock("@/context/QuickAddContext", () => ({
  useQuickAdd: () => ({
    activeSheet: null,
    openQuickAdd: mockOpenQuickAdd,
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

describe("Quick Add NAV-02: Button", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenQuickAdd.mockClear();
  });

  it.skip("renders 'Quick Add' button text when sidebar is expanded", () => {
    renderSidebar();
    expect(screen.getByText("Quick Add")).toBeInTheDocument();
  });

  it.skip("renders icon-only button with aria-label when sidebar is collapsed", () => {
    localStorage.setItem("sidebar-collapsed", "true");
    renderSidebar();
    expect(screen.getByRole("button", { name: /quick add/i })).toBeInTheDocument();
  });

  it.skip("clicking Quick Add button opens dropdown menu", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    // Dropdown items should appear
    expect(screen.getByText("Add Unit")).toBeInTheDocument();
  });
});

describe("Quick Add NAV-02: Dropdown Items", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenQuickAdd.mockClear();
  });

  it.skip("dropdown contains 'Add Unit' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Unit")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Add Faction' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Faction")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Add Paint' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Paint")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Add Recipe' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Recipe")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Create Project' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Create Project")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Log Session' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Log Session")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Add Purchase' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Purchase")).toBeInTheDocument();
  });

  it.skip("dropdown contains 'Log Battle' item", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Log Battle")).toBeInTheDocument();
  });
});

describe("Quick Add NAV-03: Action Dispatch", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenQuickAdd.mockClear();
  });

  it.skip("clicking 'Add Unit' calls openQuickAdd('add-unit')", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    fireEvent.click(screen.getByText("Add Unit"));
    expect(mockOpenQuickAdd).toHaveBeenCalledWith("add-unit");
  });

  it.skip("clicking 'Log Battle' calls openQuickAdd('log-battle')", () => {
    renderSidebar();
    fireEvent.click(screen.getByText("Quick Add"));
    fireEvent.click(screen.getByText("Log Battle"));
    expect(mockOpenQuickAdd).toHaveBeenCalledWith("log-battle");
  });
});
