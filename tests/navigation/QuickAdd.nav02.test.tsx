/**
 * Phase 27 — NAV-02 + NAV-03 Quick Add button and dropdown tests.
 *
 * Verifies the Quick Add button renders in both expanded and collapsed states,
 * opens a dropdown with 8 labeled items, and that clicking an item calls
 * openQuickAdd with the correct action identifier.
 *
 * Note: Radix DropdownMenuTrigger responds to pointer events, not just click.
 * Use userEvent (dispatches full pointer + mouse + click sequence) instead of
 * fireEvent.click for trigger interactions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders 'Quick Add' button text when sidebar is expanded", () => {
    renderSidebar();
    expect(screen.getByText("Quick Add")).toBeInTheDocument();
  });

  it("renders icon-only button with aria-label when sidebar is collapsed", () => {
    localStorage.setItem("sidebar-collapsed", "true");
    renderSidebar();
    expect(screen.getByRole("button", { name: /quick add/i })).toBeInTheDocument();
  });

  it("clicking Quick Add button opens dropdown menu", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    // Dropdown items should appear
    expect(screen.getByText("Add Unit")).toBeInTheDocument();
  });
});

describe("Quick Add NAV-02: Dropdown Items", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenQuickAdd.mockClear();
  });

  it("dropdown contains 'Add Unit' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Unit")).toBeInTheDocument();
  });

  it("dropdown contains 'Add Faction' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Faction")).toBeInTheDocument();
  });

  it("dropdown contains 'Add Paint' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Paint")).toBeInTheDocument();
  });

  it("dropdown contains 'Add Recipe' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Recipe")).toBeInTheDocument();
  });

  it("dropdown contains 'Create Project' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Create Project")).toBeInTheDocument();
  });

  it("dropdown contains 'Log Session' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Log Session")).toBeInTheDocument();
  });

  it("dropdown contains 'Add Purchase' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Add Purchase")).toBeInTheDocument();
  });

  it("dropdown contains 'Log Battle' item", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    expect(screen.getByText("Log Battle")).toBeInTheDocument();
  });
});

describe("Quick Add NAV-03: Action Dispatch", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenQuickAdd.mockClear();
  });

  it("clicking 'Add Unit' calls openQuickAdd('add-unit')", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    await user.click(screen.getByText("Add Unit"));
    expect(mockOpenQuickAdd).toHaveBeenCalledWith("add-unit");
  });

  it("clicking 'Log Battle' calls openQuickAdd('log-battle')", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByText("Quick Add"));
    await user.click(screen.getByText("Log Battle"));
    expect(mockOpenQuickAdd).toHaveBeenCalledWith("log-battle");
  });
});
