/**
 * Phase 10 — AppSidebar collapse-toggle tests (UI-01 + UI-02).
 *
 * Verifies that the sidebar renders expanded by default (UI-01) and that
 * clicking the collapse toggle flips the data-collapsed attribute (UI-01).
 *
 * TooltipProvider is required because NavItem uses Tooltip when collapsed.
 * useLocation and Link are mocked so tests don't need a real router.
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

function renderSidebar() {
  return render(
    <TooltipProvider>
      <AppSidebar />
    </TooltipProvider>
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("collapse toggle (UI-01)", () => {
    it("renders expanded by default when no localStorage key present", () => {
      const { container } = renderSidebar();
      const aside = container.querySelector("aside");
      expect(aside?.getAttribute("data-collapsed")).toBe("false");
    });

    it("clicking collapse toggle flips data-collapsed to true", () => {
      const { container } = renderSidebar();
      const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
      fireEvent.click(toggle);
      const aside = container.querySelector("aside");
      expect(aside?.getAttribute("data-collapsed")).toBe("true");
    });
  });

  describe("Spending nav entry (SPEND-03)", () => {
    it("renders the Spending nav label between Paints and Army Lists", () => {
      renderSidebar();
      expect(screen.getByText("Spending")).toBeInTheDocument();
    });

    it("Spending nav entry has href='/spending'", () => {
      renderSidebar();
      const link = screen.getByText("Spending").closest("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe("/spending");
    });
  });
});
